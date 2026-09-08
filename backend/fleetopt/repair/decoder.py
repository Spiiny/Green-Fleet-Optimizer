"""L0 -- the repair decoder.

Takes a raw candidate (parcel, vessel, route, fuel, bunker port) and either
returns a LEGAL schedule or rejects it. Nothing downstream ever sees an illegal
plan, which is why the QUBO needs no penalty terms for physical constraints.

Rules are applied in the order given in the spec. Rules 5, 7 and 11 CHANGE the
time budget, so the inner speed solve must run after this, never before.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

from ..io.schema import Instance, Vessel, Parcel, Fuel
from ..model import ports as P
from ..model import network as N
from ..model.emissions import eca_fuel_split


@dataclass
class RepairResult:
    ok: bool
    reason: str = ""
    load_factor: float = 1.0
    depart_origin: datetime = None
    arrive_dest: datetime = None
    sailing_budget_days: float = 0.0
    origin_port_hours: float = 0.0
    dest_port_hours: float = 0.0
    wait_hours: float = 0.0
    tide_wait_hours: float = 0.0
    convoy_wait_hours: float = 0.0
    eca_fuel: Optional[Fuel] = None
    eca_share: float = 0.0
    notes: list[str] = field(default_factory=list)

    def __bool__(self):
        return self.ok


def reject(reason: str) -> RepairResult:
    return RepairResult(ok=False, reason=reason)


# --------------------------------------------------------------------------- #
def repair(inst: Instance, parcel: Parcel, vessel: Vessel, route: list[str],
           fuel: Fuel, bunker_port: Optional[str] = None,
           earliest_start: Optional[datetime] = None,
           congestion_quantile: float = 0.5) -> RepairResult:

    r = RepairResult(ok=True)
    origin, dest = parcel.origin_port, parcel.dest_port

    # -- 1/2 compatibility --------------------------------------------------- #
    if parcel.cargo_type not in inst.vessel_cargo.get(vessel.vessel_id, []):
        return reject("vessel cannot carry this cargo type")
    if fuel.fuel_id not in inst.vessel_fuels.get(vessel.vessel_id, []):
        return reject("vessel cannot burn this fuel")
    if vessel.capacity_unit != parcel.unit:
        return reject("capacity unit mismatch")
    if route[0] != origin or route[-1] != dest:
        return reject("route does not connect origin to destination")

    # -- cargo handling capability at both ends ------------------------------ #
    for code in (origin, dest):
        if not P.can_handle(inst, code, parcel.cargo_type):
            return reject(f"{code} cannot handle {parcel.cargo_type}")

    # -- 3/4 draft and load factor ------------------------------------------ #
    # Draft binds only where the vessel BERTHS: origin, destination, and any
    # bunker stop. Intermediate nodes on the route graph are waypoints -- a VLCC
    # sailing past Cochin is not constrained by Cochin's depth. Conflating the
    # two makes every long-haul voyage inherit the shallowest coastal port on
    # its path, which is wrong and silently kills large-vessel options.
    call_ports = {origin, dest}
    if bunker_port is not None:
        call_ports.add(bunker_port)
    depth = min(min(inst.ports[c].max_draft_m, P.deepest_window_draft(inst, c))
                if inst.ports[c].tidal_restricted else inst.ports[c].max_draft_m
                for c in call_ports)
    if vessel.ballast_draft_m > depth:
        return reject(f"vessel cannot enter (needs {vessel.ballast_draft_m:.2f} m "
                      f"in ballast, route offers {depth:.2f} m)")

    lf_cargo = parcel.quantity / vessel.capacity
    if lf_cargo > vessel.max_load_factor:
        return reject("parcel exceeds vessel capacity")
    lf_draft = vessel.max_load_factor_for_draft(depth)
    lf = min(lf_cargo, lf_draft, vessel.max_load_factor)
    if lf < lf_cargo - 1e-9:
        # Part-loading would leave cargo behind. Allowed only if the shortfall is
        # small enough to still count as serving the parcel.
        if lf < 0.90 * lf_cargo:
            return reject(f"needs {lf_cargo:.2f} load factor, depth allows {lf_draft:.2f}")
        r.notes.append(f"part-loaded to {lf:.2f} for draft")
    if lf < vessel.min_load_factor:
        return reject("below minimum safe load factor (stability envelope)")
    r.load_factor = lf
    draft = vessel.draft_at(lf)

    # -- 12 drydock / availability ------------------------------------------ #
    start = max(parcel.laycan_start, vessel.available_from,
                earliest_start or inst.horizon_start)

    # -- 6 origin port opening hours ---------------------------------------- #
    start += timedelta(hours=P.opening_delay_h(inst.ports[origin], start))

    # -- 7 congestion at origin --------------------------------------------- #
    w_org = P.waiting_hours(inst, origin, start, quantile=congestion_quantile)
    start += timedelta(hours=w_org)

    # -- 5 tide at origin ---------------------------------------------------- #
    if inst.ports[origin].tidal_restricted:
        entry, win = P.next_tide_window(inst, origin, start, draft)
        if entry is None:
            return reject(f"no tide window at {origin} deep enough for {draft:.2f} m")
        r.tide_wait_hours += (entry - start).total_seconds() / 3600.0
        start = entry

    # -- 13 laycan ----------------------------------------------------------- #
    if start > parcel.laycan_end:
        return reject(f"cannot reach {origin} before laycan closes")

    # -- 8 loading ----------------------------------------------------------- #
    load_h = P.handling_hours(inst, origin, parcel, lf)
    if load_h == float("inf"):
        return reject("origin cannot handle this cargo")
    r.origin_port_hours = load_h
    depart = start + timedelta(hours=load_h)

    if vessel.is_in_drydock(depart):
        return reject("departure falls inside the drydock window")

    # -- 10 one-way traffic / convoy ---------------------------------------- #
    r.convoy_wait_hours = N.convoy_delay_h(inst, route)

    # -- 9 ECA fuel switching ------------------------------------------------ #
    eca_frac_route = (N.eca_distance(inst, route) /
                      max(N.route_distance(inst, route), 1e-9))
    r.eca_fuel, r.eca_share = eca_fuel_split(inst, vessel, fuel, eca_frac_route)
    if eca_frac_route > 0 and r.eca_share == 0.0 and not fuel.eca_compliant:
        return reject("route enters an ECA and the vessel has no compliant fuel")

    # -- 11 bunker reachability --------------------------------------------- #
    if bunker_port is not None:
        if bunker_port not in route:
            return reject("bunker port is not on the route")
        offer = inst.bunker.get((bunker_port, fuel.fuel_id))
        if offer is None or not offer.available:
            return reject(f"{fuel.fuel_id} not available at {bunker_port}")
    else:
        offer = inst.bunker.get((origin, fuel.fuel_id))
        if offer is None or not offer.available:
            r.notes.append("no bunkering at origin; must sail on tanks aboard")

    # -- destination side ---------------------------------------------------- #
    # Sailing time is whatever is left between departure and the deadline, minus
    # everything the destination will consume. The inner solver then spends that
    # budget optimally across the legs.
    unload_h = P.handling_hours(inst, dest, parcel, lf)
    if unload_h == float("inf"):
        return reject("destination cannot handle this cargo")
    r.dest_port_hours = unload_h

    w_dst = P.waiting_hours(inst, dest, parcel.delivery_deadline,
                            quantile=congestion_quantile)
    r.wait_hours = w_org + w_dst

    dest_overhead_h = unload_h + w_dst + r.convoy_wait_hours
    if inst.ports[dest].tidal_restricted:
        dest_overhead_h += 6.0                 # expected half tidal cycle
        r.tide_wait_hours += 6.0

    budget_days = ((parcel.delivery_deadline - depart).total_seconds() / 86400.0
                   - dest_overhead_h / 24.0)

    r.depart_origin = depart
    r.sailing_budget_days = budget_days
    r.arrive_dest = depart + timedelta(days=max(budget_days, 0.0))

    if budget_days <= 0:
        return reject("no sailing time left before the deadline")

    # Minimum physically possible sailing time at full speed
    # Per-leg, NOT route-wide: a canal speed limit binds only inside the canal.
    min_days = sum(lg.distance_nm / (24.0 * min(vessel.max_speed_kn, lg.max_speed_kn))
                   for lg in N.route_legs(inst, route))
    if min_days > budget_days:
        return reject(f"deadline unreachable even at maximum speed "
                      f"(needs {min_days:.1f} d, has {budget_days:.1f} d)")

    return r
