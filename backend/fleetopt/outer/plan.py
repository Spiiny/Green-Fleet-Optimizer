"""A Plan = a discrete assignment (from dSB) + a continuous speed policy.

The discrete block chooses WHICH options to run. The continuous block chooses
HOW FAST to run each of them, and this is where the outer level earns its keep:
the inner solve minimises fuel cost against the charter rate, which is the right
answer for f1 and the WRONG answer for f2. Emissions fall further if you sail
slower than the commercial optimum -- you just pay for the extra days.

The gene is one beta per served option:

    beta = 0  ->  the economic optimum the inner solve already found
    beta = 1  ->  the slowest the reserved slot allows

Because the slot was reserved for the slower duration in option_gen, no value of
beta can create a double-booking.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import timedelta
import numpy as np

from ..io.schema import Instance
from ..master.option_gen import Option
from ..model import network as N
from ..model.emissions import co2e_wtw, co2_ttw, ets_cost_usd
from ..inner.speed_solve import solve_voyage, InfeasibleVoyage
from ..objectives import Evaluation, evaluate
from ..master.correction import true_cost

_COND_CACHE: dict[int, list] = {}


def conditions_for(inst: Instance, o: Option):
    if o.idx not in _COND_CACHE:
        _COND_CACHE[o.idx] = N.build_conditions(inst, o.route, o.rep.depart_origin,
                                                o.vessel)
    return _COND_CACHE[o.idx]


@dataclass
class Plan:
    option_idx: list[int]
    beta: np.ndarray                      # one per entry of option_idx, in [0,1]
    ev: Evaluation | None = None
    objectives: tuple = ()
    realised: list = field(default_factory=list)
    tonne_miles: float = 0.0
    co2_intensity: float = 0.0        # g CO2e per tonne-mile

    def copy(self) -> "Plan":
        return Plan(list(self.option_idx), self.beta.copy())


# --------------------------------------------------------------------------- #
def _reprice(inst: Instance, o: Option, beta: float) -> Option:
    """Re-run the inner solve at a slower speed and rebuild the option's costs."""
    if beta <= 1e-6:
        return o
    # Handing the solver a LARGER budget changes nothing: it already returned
    # the interior economic optimum, so the budget was never binding. To sail
    # slower you must lower the time cost the solver prices against. beta=0
    # keeps the true charter rate (the commercial optimum); beta=1 drops it to
    # near zero (the fuel-minimal speed). Costs below are then rebuilt at the
    # REAL charter rate, so the extra days are paid for honestly.
    tc_eff = o.vessel.charter_rate_usd_per_day * max(0.02, 1.0 - beta)
    conds = conditions_for(inst, o)
    try:
        sol = solve_voyage(o.vessel, conds, o.fuel_price, o.budget_days, tc_eff)
    except InfeasibleVoyage:
        return o
    if sol.total_days <= o.sol.total_days + 1e-9:
        return o
    # tc_eff was a SEARCH device. Restore the true charter rate on the solution
    # so every downstream breakdown reports what the voyage actually costs --
    # otherwise the discounted rate leaks into the charter line and the port
    # residual silently absorbs the difference.
    from dataclasses import replace as _replace
    sol = _replace(sol, time_cost_usd_per_day=o.vessel.charter_rate_usd_per_day)
    T = sol.total_days
    extra_days = T - o.sol.total_days
    d_fuel = sol.fuel_t - o.sol.fuel_t
    d_cost = (sol.fuel_cost_usd - o.sol.fuel_cost_usd
              + extra_days * o.vessel.charter_rate_usd_per_day)
    d_ets = (ets_cost_usd(inst, o.fuel, sol.fuel_t, o.parcel.origin_port,
                          o.parcel.dest_port)
             - ets_cost_usd(inst, o.fuel, o.sol.fuel_t, o.parcel.origin_port,
                            o.parcel.dest_port))
    end = o.rep.depart_origin + timedelta(
        days=T + (o.rep.dest_port_hours + o.rep.wait_hours / 2) / 24.0)
    late = max(0.0, (end - o.parcel.delivery_deadline).total_seconds() / 86400.0)
    d_late = (late - o.late_days) * o.parcel.late_penalty_usd_per_day

    port_fuel_t = o.co2e_t / max(co2e_wtw(o.fuel, 1.0), 1e-9) - o.sol.fuel_t
    total_fuel = sol.fuel_t + max(port_fuel_t, 0.0)

    from dataclasses import replace
    return replace(o, sol=sol,
                   cost_usd=o.cost_usd + d_cost + d_ets + d_late,
                   co2e_t=co2e_wtw(o.fuel, total_fuel),
                   co2_ttw_t=co2_ttw(o.fuel, total_fuel),
                   late_days=late, end=end)


def realise(inst: Instance, options: list[Option], plan: Plan) -> Plan:
    """Apply the speed policy, then score with the one shared evaluator."""
    chosen = []
    for k, i in enumerate(plan.option_idx):
        chosen.append(_reprice(inst, options[i], float(plan.beta[k])))
    _, _, pairs = true_cost(inst, chosen)
    rc = sum(r.cost_usd for r in pairs.values() if r.feasible)
    rq = sum(r.co2e_t for r in pairs.values() if r.feasible)
    ev = evaluate(inst, chosen, rc, rq)
    plan.ev, plan.realised = ev, chosen
    plan.objectives = ev.as_tuple()
    # transport work actually performed, for a service-normalised carbon figure
    work = 0.0
    for o in chosen:
        qty = o.parcel.quantity * (1.0 if o.parcel.unit == "MT" else 14.0)
        work += qty * N.route_distance(inst, o.route)
    plan.tonne_miles = work
    plan.co2_intensity = (ev.f2_co2e_t * 1e6 / work) if work > 0 else float("inf")
    return plan


def make_plan(inst: Instance, options: list[Option], chosen: list[Option],
              beta: np.ndarray | float = 0.0) -> Plan:
    idx = [o.idx for o in chosen]
    b = (np.full(len(idx), float(beta)) if np.isscalar(beta)
         else np.asarray(beta, float)[:len(idx)])
    if len(b) < len(idx):
        b = np.concatenate([b, np.zeros(len(idx) - len(b))])
    return realise(inst, options, Plan(idx, np.clip(b, 0.0, 1.0)))
