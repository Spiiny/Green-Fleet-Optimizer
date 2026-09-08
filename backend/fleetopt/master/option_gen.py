"""M3 -- enumerate legal options and price every one of them exactly.

An OPTION is one complete way of serving one parcel:
    (parcel, vessel, route, fuel, bunker port)

Every option is pushed through the repair decoder and then the inner convex
speed solve, so its cost is a real number, not an estimate. What the QUBO then
searches over is which SET of options to pick -- that is the only genuinely
combinatorial part of the problem.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import os, pickle, hashlib

from ..io.schema import Instance, Vessel, Parcel, Fuel
from ..model import network as N
from ..model import ports as P
from ..model.emissions import co2_ttw, co2e_wtw, ets_cost_usd
from ..repair.decoder import repair, RepairResult
from ..inner.speed_solve import solve_voyage, VoyageSolution, InfeasibleVoyage

DEFAULT_FUEL_PRICE = 800.0          # fallback when a fuel is not sold at origin

# How much slower than the economic optimum the outer level may run a voyage.
# The vessel is reserved for this window, so a larger value gives M5 more room
# to trade speed for emissions but blocks more pairings. 1.35 keeps ~all of the
# achievable CO2 reduction (fuel falls with the cube of speed, so a 35% longer
# voyage is already a large cut) while costing far fewer feasible combinations
# than reserving the full slack to the deadline.
SLOWDOWN_ALLOWANCE = 1.35


@dataclass
class Option:
    idx: int
    parcel: Parcel
    vessel: Vessel
    route: list[str]
    fuel: Fuel
    bunker_port: Optional[str]
    rep: RepairResult
    sol: VoyageSolution
    # priced quantities
    cost_usd: float                 # GROSS cost, positive. Revenue is separate.
    revenue_usd: float
    co2e_t: float                   # well-to-wake
    co2_ttw_t: float
    late_days: float
    start: datetime                 # vessel is committed from here...
    end: datetime                   # ...to here (economic-optimal arrival)
    slot_end: datetime              # ...but the SLOT runs to the deadline
    t_min_days: float               # minimum sailing time at max legal speed
    budget_days: float              # maximum sailing time before the deadline
    fuel_price: float

    @property
    def net_usd(self) -> float:
        """Cost minus revenue. Negative means this voyage makes money."""
        return self.cost_usd - self.revenue_usd

    @property
    def parcel_id(self) -> str: return self.parcel.parcel_id

    @property
    def vessel_id(self) -> str: return self.vessel.vessel_id

    def overlaps(self, other: "Option") -> bool:
        """Conflict on the reserved SLOT, not on the optimal duration.

        The outer level may slow a voyage down to cut emissions, so the vessel
        must be reserved for the whole window it could legally occupy. Booking
        only the economic-optimal duration would let M5 create double-bookings
        the moment it slowed anything down.
        """
        return self.start < other.slot_end and other.start < self.slot_end

    def __repr__(self):
        return (f"<{self.parcel_id}/{self.vessel_id}/{self.fuel.fuel_id}"
                f"/{'-'.join(self.route)} net ${self.net_usd:,.0f}>")


# --------------------------------------------------------------------------- #
def fuel_price_at(inst: Instance, port: str, fuel_id: str) -> float:
    off = inst.bunker.get((port, fuel_id))
    if off is not None and off.available:
        return off.price_usd_per_t
    # not sold here: the cheapest place on the network, plus a deviation premium
    cands = [o.price_usd_per_t for (p, f), o in inst.bunker.items()
             if f == fuel_id and o.available]
    return min(cands) * 1.06 if cands else DEFAULT_FUEL_PRICE


def feasible_bunker_ports(inst: Instance, route: list[str], fuel_id: str) -> list:
    out = [None]
    for c in route:
        off = inst.bunker.get((c, fuel_id))
        if off is not None and off.available:
            out.append(c)
    return out[:3]                  # cap the branching factor


# --------------------------------------------------------------------------- #
def price_option(inst: Instance, parcel, vessel, route, fuel, bunker_port,
                 rep: RepairResult) -> Option | None:
    """Run the inner solve and turn a repaired plan into a costed option."""
    price = fuel_price_at(inst, bunker_port or parcel.origin_port, fuel.fuel_id)
    conds = N.build_conditions(inst, route, rep.depart_origin, vessel)
    try:
        sol = solve_voyage(vessel, conds, price, rep.sailing_budget_days,
                           vessel.charter_rate_usd_per_day)
    except InfeasibleVoyage:
        return None

    # tank capacity: a voyage the ship cannot physically carry fuel for is out.
    # Methanol bites here -- half the LCV means double the tonnage.
    if sol.fuel_t > vessel.fuel_tank_capacity_t - vessel.min_fuel_reserve_t:
        if bunker_port is None:
            return None

    # --- cost build-up ----------------------------------------------------- #
    port_cost = sum(P.port_call_cost(inst.ports[c], vessel)
                    for c in {parcel.origin_port, parcel.dest_port} |
                             ({bunker_port} if bunker_port else set()))
    toll = N.canal_toll(inst, route, vessel)
    ets = ets_cost_usd(inst, fuel, sol.fuel_t, parcel.origin_port, parcel.dest_port)

    # port stays and waits also cost charter time and auxiliary fuel
    port_days = (rep.origin_port_hours + rep.dest_port_hours +
                 rep.wait_hours + rep.tide_wait_hours + rep.convoy_wait_hours) / 24.0
    port_fuel_t = port_days * vessel.aux_port_t_per_day
    idle_cost = port_days * vessel.charter_rate_usd_per_day + port_fuel_t * price

    overhead_d = (rep.dest_port_hours + rep.wait_hours / 2) / 24.0
    end = rep.depart_origin + timedelta(days=sol.total_days + overhead_d)
    slot_days = min(rep.sailing_budget_days, sol.total_days * SLOWDOWN_ALLOWANCE)
    slot_end = rep.depart_origin + timedelta(days=slot_days + overhead_d)
    t_min = sum(L.distance_nm / (24.0 * min(vessel.max_speed_kn, L.speed_cap_kn))
                for L in conds)
    late_days = max(0.0, (end - parcel.delivery_deadline).total_seconds() / 86400.0)

    total_fuel = sol.fuel_t + port_fuel_t
    cost = (sol.fuel_cost_usd + sol.time_cost_usd + idle_cost + port_cost + toll
            + ets + late_days * parcel.late_penalty_usd_per_day)
    delivered = min(1.0, rep.load_factor / max(parcel.quantity / vessel.capacity, 1e-9))
    revenue = parcel.freight_revenue_usd * delivered

    return Option(
        idx=-1, parcel=parcel, vessel=vessel, route=route, fuel=fuel,
        bunker_port=bunker_port, rep=rep, sol=sol,
        cost_usd=cost, revenue_usd=revenue, co2e_t=co2e_wtw(fuel, total_fuel),
        co2_ttw_t=co2_ttw(fuel, total_fuel), late_days=late_days,
        start=rep.depart_origin - timedelta(hours=rep.origin_port_hours),
        end=end, slot_end=slot_end, t_min_days=t_min,
        budget_days=slot_days, fuel_price=price)


# --------------------------------------------------------------------------- #
def build_options(inst: Instance, k_routes: int = 3, verbose: bool = False,
                  cache_dir: str | None = ".cache") -> list[Option]:
    """Enumerate, repair, and price. Cached by instance fingerprint."""
    key = hashlib.md5(
        f"{inst.scenario}|{k_routes}|{len(inst.parcels)}|{len(inst.legs)}|"
        f"{sum(v.charter_rate_usd_per_day for v in inst.vessels.values())}"
        .encode()).hexdigest()[:12]
    path = os.path.join(cache_dir, f"options_{key}.pkl") if cache_dir else None
    if path and os.path.exists(path):
        with open(path, "rb") as fh:
            return pickle.load(fh)

    opts: list[Option] = []
    for parcel in inst.parcels.values():
        for vessel in inst.compatible_vessels(parcel):
            routes = N.k_shortest_routes(inst, parcel.origin_port,
                                         parcel.dest_port, k=k_routes)
            for route in routes:
                for fuel in inst.compatible_fuels(vessel):
                    for bp in feasible_bunker_ports(inst, route, fuel.fuel_id):
                        rep = repair(inst, parcel, vessel, route, fuel, bp)
                        if not rep:
                            continue
                        o = price_option(inst, parcel, vessel, route, fuel, bp, rep)
                        if o is not None:
                            opts.append(o)
        if verbose:
            n = sum(1 for o in opts if o.parcel_id == parcel.parcel_id)
            print(f"  {parcel.parcel_id}: {n:4d} priced options")

    for i, o in enumerate(opts):
        o.idx = i
    if path:
        os.makedirs(cache_dir, exist_ok=True)
        with open(path, "wb") as fh:
            pickle.dump(opts, fh)
    return opts


def group_by_parcel(options: list[Option]) -> dict[str, list[Option]]:
    g: dict[str, list[Option]] = {}
    for o in options:
        g.setdefault(o.parcel_id, []).append(o)
    return g


def conflict_pairs(options: list[Option]) -> list[tuple[int, int]]:
    """Option pairs that cannot both be chosen: same vessel, overlapping time."""
    by_v: dict[str, list[Option]] = {}
    for o in options:
        by_v.setdefault(o.vessel_id, []).append(o)
    out = []
    for group in by_v.values():
        group.sort(key=lambda o: o.start)
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                if b.start >= a.slot_end:
                    break               # sorted, so nothing later can overlap
                out.append((a.idx, b.idx))
    return out
