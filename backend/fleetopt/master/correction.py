"""M4c -- the correction loop.

The cost table prices every option in ISOLATION. That misses one thing: when a
vessel serves two parcels in sequence it must sail empty from the first
destination to the second origin. That ballast leg costs fuel, time and CO2, and
it belongs to the PAIR, not to either option alone.

Quadratic coupling on a pair is exactly what a QUBO can express, so we feed the
correction back into Q[i,j] and re-solve. The table estimate is always
optimistic (it ignores repositioning entirely), so every correction is
non-negative and the loop tightens monotonically -- which is why it converges.
"""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np

from .option_gen import Option
from ..io.schema import Instance
from ..model import network as N
from ..model.emissions import co2e_wtw
from ..inner.speed_solve import LegCondition, solve_voyage, InfeasibleVoyage


@dataclass
class Reposition:
    feasible: bool
    cost_usd: float = 0.0
    co2e_t: float = 0.0
    days: float = 0.0
    reason: str = ""


def reposition(inst: Instance, a: Option, b: Option) -> Reposition:
    """Ballast run from a's destination to b's origin, in the gap between them."""
    src, dst = a.parcel.dest_port, b.parcel.origin_port
    if src == dst:
        return Reposition(True, 0.0, 0.0, 0.0)

    gap_days = (b.start - a.end).total_seconds() / 86400.0
    if gap_days <= 0:
        return Reposition(False, reason="no gap between the two voyages")

    routes = N.k_shortest_routes(inst, src, dst, k=1)
    if not routes:
        return Reposition(False, reason=f"no route {src}->{dst}")
    route = routes[0]
    v = a.vessel

    conds = N.build_conditions(inst, route, a.end, v)
    try:
        sol = solve_voyage(v, conds, b.fuel_price, gap_days,
                           v.charter_rate_usd_per_day)
    except InfeasibleVoyage:
        return Reposition(False, reason="cannot reach the next load port in time")

    port_cost = sum(inst.ports[c].port_dues_usd_per_gt * v.gross_tonnage
                    for c in (src, dst)) * 0.5      # transit, not a full call
    cost = sol.fuel_cost_usd + sol.time_cost_usd + port_cost \
        + N.canal_toll(inst, route, v)
    return Reposition(True, cost, co2e_wtw(b.fuel, sol.fuel_t), sol.total_days)


# --------------------------------------------------------------------------- #
def sequence_by_vessel(chosen: list[Option]) -> dict[str, list[Option]]:
    out: dict[str, list[Option]] = {}
    for o in chosen:
        out.setdefault(o.vessel_id, []).append(o)
    for g in out.values():
        g.sort(key=lambda o: o.start)
    return out


def true_cost(inst: Instance, chosen: list[Option]) -> tuple[float, float, dict]:
    """Exact cost of the whole plan, including every ballast leg. This -- never
    the table sum -- is what gets reported."""
    base = sum(o.net_usd for o in chosen)
    base_co2 = sum(o.co2e_t for o in chosen)
    extra = extra_co2 = 0.0
    pairs: dict[tuple[int, int], Reposition] = {}
    for group in sequence_by_vessel(chosen).values():
        for a, b in zip(group, group[1:]):
            rp = reposition(inst, a, b)
            pairs[(a.idx, b.idx)] = rp
            if rp.feasible:
                extra += rp.cost_usd
                extra_co2 += rp.co2e_t
    return base + extra, base_co2 + extra_co2, pairs


def apply_corrections(Q: np.ndarray, pairs: dict, A: float, cost_scale: float,
                      learned: dict) -> float:
    """Push repositioning cost onto the pairwise QUBO coefficients.

    Returns the largest correction applied, for the convergence test.
    """
    biggest = 0.0
    for (i, j), rp in pairs.items():
        if not rp.feasible:
            delta = A                       # forbid the pairing outright
        else:
            delta = rp.cost_usd / cost_scale
        prev = learned.get((i, j), 0.0)
        step = delta - prev
        if abs(step) < 1e-12:
            continue
        Q[i, j] += 0.5 * step
        Q[j, i] += 0.5 * step
        learned[(i, j)] = delta
        biggest = max(biggest, abs(step))
    return biggest
