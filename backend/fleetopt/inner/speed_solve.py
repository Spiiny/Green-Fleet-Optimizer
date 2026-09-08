"""L1 -- exact continuous speed optimisation.

The whole architecture rests on this: for a FIXED discrete plan (vessel, route,
fuel, deadline), choosing speeds is a convex program with a closed-form solution
per leg and a single scalar coupling them. No search, no discretisation.

    minimise   sum_i  p * F_i(t_i)
    s.t.       sum_i  t_i  <=  T_avail
               t_min_i <= t_i <= t_max_i

    F_i(t) = a * m_i * t * u_i(t)^b  +  aux * t
    u_i(t) = d_i / (24 t) - c_i          (through-water speed, knots)

The Lagrangian separates, so for a fixed multiplier lam (USD/day -- the marginal
value of one more day of voyage time) each leg is solved independently. Total
time is monotone decreasing in lam, so bisection on lam is exact.
"""
from __future__ import annotations
from dataclasses import dataclass
import math
import numpy as np
from scipy.optimize import brentq

from ..io.schema import Vessel


@dataclass(frozen=True)
class LegCondition:
    """One sub-leg as the solver sees it. Weather is already resolved."""
    distance_nm: float
    resistance_multiplier: float = 1.0
    current_kn: float = 0.0           # +ve = favourable (pushes the ship along)
    speed_cap_kn: float = 99.0        # from legs.max_speed_kn / canal limits
    label: str = ""


@dataclass
class VoyageSolution:
    times_days: list[float]
    speeds_kn: list[float]            # through-water speed
    fuel_t: float
    lam_usd_per_day: float            # TOTAL marginal value of a day (see below)
    fuel_cost_usd: float
    binding: bool                     # was the time budget tight?
    time_cost_usd_per_day: float = 0.0

    @property
    def total_days(self) -> float:
        return sum(self.times_days)

    @property
    def scarcity_usd_per_day(self) -> float:
        """The part of lam attributable to the DEADLINE rather than to the
        standing opportunity cost of the ship. Zero on a slack schedule."""
        return max(0.0, self.lam_usd_per_day - self.time_cost_usd_per_day)

    @property
    def time_cost_usd(self) -> float:
        return self.time_cost_usd_per_day * self.total_days


# --------------------------------------------------------------------------- #
# Per-leg primitives
# --------------------------------------------------------------------------- #
def _bounds(v: Vessel, leg: LegCondition) -> tuple[float, float]:
    """Time bounds (days) implied by the speed envelope. Returns (t_min, t_max)."""
    v_hi = min(v.max_speed_kn, leg.speed_cap_kn)
    v_lo = v.min_speed_kn
    if v_lo >= v_hi:
        # A canal or channel cap below the vessel's own minimum. The cap is a
        # legal limit, so it wins; the ship crawls.
        v_lo = v_hi * 0.999
    # ground speed = through-water + current
    g_hi = max(v_hi + leg.current_kn, 0.1)
    g_lo = max(v_lo + leg.current_kn, 0.05)
    return leg.distance_nm / (24.0 * g_hi), leg.distance_nm / (24.0 * g_lo)


def leg_fuel(v: Vessel, leg: LegCondition, t_days: float) -> float:
    """Total tonnes burned on this leg if it takes t_days."""
    if t_days <= 0:
        return math.inf
    u = leg.distance_nm / (24.0 * t_days) - leg.current_kn
    if u <= 0:
        return math.inf
    return (v.fuel_a * leg.resistance_multiplier * t_days * u ** v.fuel_b
            + v.aux_sea_t_per_day * t_days)


def _dfuel_dt(v: Vessel, leg: LegCondition, t_days: float) -> float:
    """dF/dt. Increasing in t because F is convex -- that is what makes the
    root-finding below well posed."""
    u = leg.distance_nm / (24.0 * t_days) - leg.current_kn
    if u <= 0:
        return -math.inf
    a, b, m = v.fuel_a, v.fuel_b, leg.resistance_multiplier
    return a * m * u ** (b - 1.0) * (u * (1.0 - b) - b * leg.current_kn) + v.aux_sea_t_per_day


def solve_leg(v: Vessel, leg: LegCondition, price: float, lam: float) -> float:
    """argmin over t of  price*F(t) + lam*t,  clipped to the speed envelope.

    Closed form for the common case (b == 3, no current); Brent otherwise.
    """
    t_lo, t_hi = _bounds(v, leg)

    if abs(leg.current_kn) < 1e-9 and abs(v.fuel_b - 3.0) < 1e-9:
        # 2*a*m*u^3 = aux + lam/price   ->   t = (2A / (aux + lam/p))^(1/3)
        denom = v.aux_sea_t_per_day + (lam / price if price > 0 else 0.0)
        if denom <= 0:
            return t_hi
        A = v.fuel_a * leg.resistance_multiplier * leg.distance_nm ** 3 / 24.0 ** 3
        t = (2.0 * A / denom) ** (1.0 / 3.0)
        return min(max(t, t_lo), t_hi)

    h = lambda t: price * _dfuel_dt(v, leg, t) + lam        # increasing in t
    if h(t_lo) >= 0.0:
        return t_lo                                          # go as fast as allowed
    if h(t_hi) <= 0.0:
        return t_hi                                          # go as slow as allowed
    return brentq(h, t_lo, t_hi, xtol=1e-12, rtol=1e-14, maxiter=200)


# --------------------------------------------------------------------------- #
# Voyage solve
# --------------------------------------------------------------------------- #
def solve_voyage(v: Vessel, legs: list[LegCondition], price: float,
                 T_avail_days: float, time_cost_usd_per_day: float = 0.0,
                 iters: int = 80) -> VoyageSolution:
    """Globally optimal speed profile subject to a total sailing-time budget.

    T_avail_days must already have port stays, tidal waits and congestion
    subtracted -- run the repair decoder FIRST.

    time_cost_usd_per_day is the STANDING cost of holding the ship another day:
    charter rate, or opportunity cost. Pass it. Without it the fuel-minimising
    speed for most of these vessels is 4-6 kn, far below any commercial reality,
    because nothing penalises taking forever. Charter cost -- not auxiliary load
    -- is what actually sets the floor on slow steaming.

    The returned lam_usd_per_day is the TOTAL marginal value of a day
    (time_cost + deadline scarcity). Use .scarcity_usd_per_day for the part the
    deadline is responsible for.
    """
    if not legs:
        return VoyageSolution([], [], 0.0, time_cost_usd_per_day, 0.0, False,
                              time_cost_usd_per_day)

    tc = max(0.0, time_cost_usd_per_day)
    t_free = [solve_leg(v, L, price, tc) for L in legs]
    lo_sum = sum(_bounds(v, L)[0] for L in legs)
    if T_avail_days < lo_sum - 1e-9:
        raise InfeasibleVoyage(
            f"budget {T_avail_days:.3f} d is below the minimum sailing time "
            f"{lo_sum:.3f} d at maximum speed")

    if sum(t_free) <= T_avail_days + 1e-12:
        # the deadline is slack: the economic optimum already fits inside it
        return _assemble(v, legs, t_free, price, tc, binding=False, tc=tc)

    lo, hi = tc, max(tc, 1.0) * 4.0
    while sum(solve_leg(v, L, price, hi) for L in legs) > T_avail_days:
        hi *= 4.0
        if hi > 1e12:
            break
    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        if sum(solve_leg(v, L, price, mid) for L in legs) > T_avail_days:
            lo = mid
        else:
            hi = mid
    t = [solve_leg(v, L, price, hi) for L in legs]
    return _assemble(v, legs, t, price, hi, binding=True, tc=tc)


def _assemble(v, legs, t, price, lam, binding, tc=0.0) -> VoyageSolution:
    fuel = sum(leg_fuel(v, L, ti) for L, ti in zip(legs, t))
    spds = [L.distance_nm / (24.0 * ti) - L.current_kn for L, ti in zip(legs, t)]
    return VoyageSolution(times_days=list(t), speeds_kn=spds, fuel_t=fuel,
                          lam_usd_per_day=lam, fuel_cost_usd=fuel * price,
                          binding=binding, time_cost_usd_per_day=tc)


class InfeasibleVoyage(ValueError):
    """The deadline cannot be met even at maximum speed."""


# --------------------------------------------------------------------------- #
# Convexity guard -- runs in CI, not in the hot loop
# --------------------------------------------------------------------------- #
def verify_convexity(v: Vessel, leg: LegCondition, n: int = 300) -> bool:
    """Assert F(t) is convex on the operating interval. If this ever fails the
    closed form is invalid and solve_leg must fall back to golden section."""
    t_lo, t_hi = _bounds(v, leg)
    ts = np.linspace(t_lo, t_hi, n)
    fs = np.array([leg_fuel(v, leg, t) for t in ts])
    if not np.all(np.isfinite(fs)):
        return False
    second = fs[2:] - 2.0 * fs[1:-1] + fs[:-2]
    return bool(np.all(second >= -1e-9 * max(1.0, np.abs(fs).max())))


def marginal_fuel_per_day(v: Vessel, leg: LegCondition, t_days: float) -> float:
    """Fuel saved per extra day on this leg. At the optimum this is equal across
    every unclipped leg -- that equality is the KKT condition and the strongest
    correctness test available."""
    return -_dfuel_dt(v, leg, t_days)
