import math
import numpy as np
import pytest

from fleetopt.io.loader import load_instance
from fleetopt.inner.speed_solve import (LegCondition, solve_leg, solve_voyage,
                                        leg_fuel, verify_convexity,
                                        marginal_fuel_per_day, _bounds,
                                        InfeasibleVoyage)

INST = load_instance("data")
RNG = np.random.default_rng(7)


def rand_leg(rng):
    return LegCondition(distance_nm=rng.uniform(60, 3600),
                        resistance_multiplier=rng.uniform(1.0, 1.6),
                        current_kn=rng.uniform(-1.5, 1.5),
                        speed_cap_kn=rng.choice([8.0, 99.0, 99.0, 99.0]))


# --------------------------------------------------------------------------- #
def test_convexity_all_vessels_all_areas():
    """If this fails the closed form is not valid and everything downstream lies."""
    areas = sorted({w.sea_area for w in INST.weather.values()})
    for v in INST.vessels.values():
        for area in areas:
            w = next(x for x in INST.weather.values() if x.sea_area == area)
            leg = LegCondition(1200.0, w.resistance_multiplier, w.current_kn)
            assert verify_convexity(v, leg), f"F(t) not convex: {v.vessel_id} / {area}"


def test_closed_form_matches_brent():
    """The b==3, no-current fast path must agree with the general root finder."""
    from fleetopt.inner import speed_solve as ss
    for _ in range(500):
        v = INST.vessels[RNG.choice(list(INST.vessels))]
        leg = LegCondition(distance_nm=RNG.uniform(100, 3000),
                           resistance_multiplier=RNG.uniform(1.0, 1.5),
                           current_kn=0.0)
        price = RNG.uniform(400, 900)
        lam = RNG.uniform(0, 400_000)
        t_fast = solve_leg(v, leg, price, lam)
        # force the general path by nudging b imperceptibly
        v_gen = type(v)(**{**v.__dict__, "fuel_b": v.fuel_b + 1e-12})
        t_slow = solve_leg(v_gen, leg, price, lam)
        assert abs(t_fast - t_slow) <= 1e-7 * max(1.0, t_fast), (t_fast, t_slow)


def test_bounds_respected():
    for _ in range(300):
        v = INST.vessels[RNG.choice(list(INST.vessels))]
        leg = rand_leg(RNG)
        t = solve_leg(v, leg, RNG.uniform(400, 900), RNG.uniform(0, 1e6))
        lo, hi = _bounds(v, leg)
        assert lo - 1e-9 <= t <= hi + 1e-9
        u = leg.distance_nm / (24 * t) - leg.current_kn
        cap = min(v.max_speed_kn, leg.speed_cap_kn)
        assert u <= cap + 1e-6                       # legal cap always wins
        assert u >= min(v.min_speed_kn, cap) - 1e-6  # cap may sit below v_min


def test_monotone_in_budget():
    """More time must never cost more fuel."""
    v = INST.vessels["V08"]
    legs = [LegCondition(400, 1.05, 0.2), LegCondition(400, 1.20, -0.3),
            LegCondition(400, 1.10, 0.0), LegCondition(400, 1.02, 0.4)]
    prev = math.inf
    for T in [3.4, 3.8, 4.4, 5.2, 6.0, 7.5]:
        sol = solve_voyage(v, legs, 558.0, T)
        assert sol.fuel_t <= prev + 1e-9
        prev = sol.fuel_t


def test_lambda_is_the_marginal_cost_of_a_day():
    """dCost/dT should equal -lam. This is the economic meaning of the multiplier
    and the single most informative correctness check in the suite."""
    v = INST.vessels["V03"]
    legs = [LegCondition(620, 1.12, 0.1), LegCondition(540, 1.25, -0.2),
            LegCondition(780, 1.05, 0.3)]
    price, T, h = 596.0, 5.5, 1e-4
    tc = v.charter_rate_usd_per_day
    s0 = solve_voyage(v, legs, price, T, tc)
    assert s0.binding, "pick a tighter budget or the multiplier is zero"
    assert s0.scarcity_usd_per_day > 0
    s1 = solve_voyage(v, legs, price, T + h, tc)
    s2 = solve_voyage(v, legs, price, T - h, tc)
    fd = (s1.fuel_cost_usd - s2.fuel_cost_usd) / (2 * h)
    assert abs(fd + s0.lam_usd_per_day) <= 1e-3 * abs(s0.lam_usd_per_day), (fd, s0.lam_usd_per_day)


def test_kkt_equal_marginal_savings():
    """At the optimum, every unclipped leg saves the SAME fuel per extra day.
    That is the whole idea: move hours from where they save little to where they
    save a lot, until nothing is left to gain."""
    v = INST.vessels["V05"]
    legs = [LegCondition(900, 1.03, 0.0), LegCondition(1200, 1.34, 0.0),
            LegCondition(450, 1.15, 0.0), LegCondition(2100, 1.08, 0.0)]
    price = 612.0
    sol = solve_voyage(v, legs, price, 15.0)
    marg = []
    for L, t in zip(legs, sol.times_days):
        lo, hi = _bounds(v, L)
        if lo + 1e-6 < t < hi - 1e-6:          # only unclipped legs
            marg.append(marginal_fuel_per_day(v, L, t))
    assert len(marg) >= 2, "need at least two interior legs to compare"
    assert max(marg) - min(marg) <= 1e-6 * max(1.0, abs(marg[0])), marg


def test_infeasible_budget_raises():
    v = INST.vessels["V01"]
    legs = [LegCondition(3000, 1.2, 0.0)]
    with pytest.raises(InfeasibleVoyage):
        solve_voyage(v, legs, 558.0, 1.0)


def test_charter_cost_sets_the_slow_steaming_floor():
    """With fuel cost alone the optimum is ~4-6 kn -- commercially absurd. It is
    the CHARTER rate that pulls the economic optimum up to a realistic speed."""
    v = INST.vessels["V02"]
    leg = LegCondition(1000, 1.0, 0.0)
    lo, hi = _bounds(v, leg)

    t_no_charter = solve_leg(v, leg, 558.0, 0.0)
    assert t_no_charter >= hi - 1e-9, "without a time cost it should pin to v_min"

    t_charter = solve_leg(v, leg, 558.0, v.charter_rate_usd_per_day)
    assert lo + 1e-6 < t_charter < hi - 1e-6, "charter cost should land it interior"
    u = leg.distance_nm / (24 * t_charter)
    assert 9.5 < u < 13.0, f"expected a realistic slow-steaming speed, got {u:.2f}"


def test_slack_deadline_gives_zero_scarcity():
    v = INST.vessels["V03"]
    legs = [LegCondition(500, 1.1, 0.0), LegCondition(500, 1.1, 0.0)]
    sol = solve_voyage(v, legs, 596.0, 30.0, v.charter_rate_usd_per_day)
    assert not sol.binding
    assert sol.scarcity_usd_per_day == 0.0
    assert sol.lam_usd_per_day == pytest.approx(v.charter_rate_usd_per_day)
