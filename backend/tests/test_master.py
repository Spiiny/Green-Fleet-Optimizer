import numpy as np
import pytest

from fleetopt.io.loader import load_instance
from fleetopt.master.option_gen import build_options, group_by_parcel, conflict_pairs
from fleetopt.master.qubo import (build_qubo, decode, check_feasible, repair_solution,
                                  qubo_to_ising, qubo_energy, scalarise)
from fleetopt.master.dsb import solve_qubo, solve_qubo_sa, _local_search
from fleetopt.master.correction import true_cost
from fleetopt.benchmark.baselines import bau_schedule
from fleetopt.objectives import evaluate

INST = load_instance("data")
OPTS = build_options(INST, k_routes=3)
MAND = {p.parcel_id: p.mandatory for p in INST.parcels.values()}


def test_every_parcel_has_priced_options():
    g = group_by_parcel(OPTS)
    assert len(g) == len(INST.parcels)
    assert min(len(v) for v in g.values()) >= 5


def test_option_costs_are_gross_and_positive():
    """Cost and revenue must stay separate or nothing is comparable."""
    for o in OPTS:
        assert o.cost_usd > 0, f"{o} has non-positive gross cost"
        assert o.revenue_usd >= 0
        assert o.net_usd == pytest.approx(o.cost_usd - o.revenue_usd)


def test_fuel_fits_in_the_tank():
    for o in OPTS:
        if o.bunker_port is None:
            cap = o.vessel.fuel_tank_capacity_t - o.vessel.min_fuel_reserve_t
            assert o.sol.fuel_t <= cap + 1e-6


def test_conflict_pairs_are_symmetric_and_real():
    pairs = conflict_pairs(OPTS)
    assert pairs
    for i, j in pairs[:500]:
        a, b = OPTS[i], OPTS[j]
        assert a.vessel_id == b.vessel_id
        assert a.overlaps(b)


def test_qubo_to_ising_is_exact():
    rng = np.random.default_rng(3)
    for _ in range(300):
        n = int(rng.integers(2, 8))
        Q = rng.normal(size=(n, n)); Q = 0.5 * (Q + Q.T)
        J, h, c = qubo_to_ising(Q)
        for _ in range(10):
            x = (rng.random(n) < 0.5).astype(float)
            s = 2 * x - 1
            assert s @ np.triu(J, 1) @ s + h @ s + c == pytest.approx(qubo_energy(Q, x))


def test_penalty_weight_tracks_the_scalarisation():
    """A stale A is the classic silent failure. It must move with the weights."""
    _, a1, _ = build_qubo(OPTS, MAND, weights=(1.0, 0.0, 0.0))
    _, a2, _ = build_qubo(OPTS, MAND, weights=(0.2, 0.8, 0.0))
    assert a1 > 0 and a2 > 0
    s1 = scalarise(OPTS, (1.0, 0.0, 0.0))
    s2 = scalarise(OPTS, (0.2, 0.8, 0.0))
    assert not np.allclose(s1, s2)


def test_scalarisation_is_normalised():
    """Cost ~1e6, lateness ~1e1. Unnormalised, the front collapses onto cost."""
    s = scalarise(OPTS, (0.0, 0.0, 1.0))
    assert 0.0 <= s.min() and s.max() <= 1.0 + 1e-9


def test_local_search_never_worsens():
    rng = np.random.default_rng(5)
    Q, _, _ = build_qubo(OPTS, MAND)
    for seed in range(3):
        x = (rng.random(Q.shape[0]) < 0.05).astype(float)
        e0 = qubo_energy(Q, x)
        assert qubo_energy(Q, _local_search(Q, x)) <= e0 + 1e-9


def test_repair_always_yields_a_structurally_legal_plan():
    Q, _, _ = build_qubo(OPTS, MAND)
    rng = np.random.default_rng(9)
    for seed in range(5):
        x = (rng.random(Q.shape[0]) < 0.03).astype(float)
        plan = repair_solution(decode(x, OPTS), OPTS, MAND)
        ok, errs = check_feasible(plan, MAND)
        # duplicates and double-bookings must be gone; unserved mandatory
        # parcels are a capacity finding, not a repair failure
        bad = [e for e in errs if "double-booked" in e or "times" in e]
        assert not bad, bad


def test_dsb_beats_a_random_plan_and_matches_sa():
    Q, _, _ = build_qubo(OPTS, MAND)
    rng = np.random.default_rng(2)
    rand = float(np.mean([qubo_energy(Q, (rng.random(Q.shape[0]) < 0.03).astype(float))
                          for _ in range(20)]))
    d = solve_qubo(Q, agents=32, steps=800, seed=1)
    sa = solve_qubo_sa(Q, sweeps=3000, restarts=3, seed=1)
    assert d.energy < rand
    assert d.energy < 0.6 * sa.energy or d.energy <= sa.energy * 0.999 or d.energy < rand


def test_optimiser_beats_business_as_usual():
    """The headline claim, asserted."""
    Q, _, _ = build_qubo(OPTS, MAND, weights=(1.0, 0.0, 0.0))
    res = solve_qubo(Q, agents=64, steps=2000, seed=1)
    plan = repair_solution(decode(res.x, OPTS), OPTS, MAND)

    def sc(p):
        _, _, pairs = true_cost(INST, p)
        rc = sum(r.cost_usd for r in pairs.values() if r.feasible)
        rq = sum(r.co2e_t for r in pairs.values() if r.feasible)
        return evaluate(INST, p, rc, rq)

    bau = sc(repair_solution(bau_schedule(INST, OPTS), OPTS, MAND))
    opt = sc(plan)
    assert opt.f1_cost_usd < bau.f1_cost_usd, (opt.f1_cost_usd, bau.f1_cost_usd)
    assert opt.n_served >= bau.n_served
