import numpy as np
import pytest

from fleetopt.io.loader import load_instance
from fleetopt.master.option_gen import build_options
from fleetopt.master.qubo import build_qubo, decode, repair_solution
from fleetopt.master.dsb import solve_qubo
from fleetopt.outer.plan import make_plan, realise, Plan
from fleetopt.outer.archive import Archive, non_dominated, crowding_distance, dominates
from fleetopt.outer import qpso
from fleetopt.outer.moead_awa import das_dennis, tchebycheff
from fleetopt.benchmark.indicators import hypervolume, igd_plus, spacing

INST = load_instance("data")
OPTS = build_options(INST, k_routes=3)
MAND = {p.parcel_id: p.mandatory for p in INST.parcels.values()}


def a_plan(beta=0.0):
    Q, _, _ = build_qubo(OPTS, MAND, weights=(1.0, 0.0, 0.0))
    r = solve_qubo(Q, agents=32, steps=600, seed=1)
    return make_plan(INST, OPTS, repair_solution(decode(r.x, OPTS), OPTS, MAND), beta)


def test_beta_actually_slows_the_fleet_down():
    """The bug this guards: handing solve_voyage a bigger budget changes
    nothing, because the budget was never binding. beta must lower the time
    cost, not raise the budget."""
    fast, slow = a_plan(0.0), a_plan(1.0)
    d_fast = sum(o.sol.total_days for o in fast.realised)
    d_slow = sum(o.sol.total_days for o in slow.realised)
    assert d_slow > d_fast * 1.02, (d_fast, d_slow)
    assert slow.objectives[1] < fast.objectives[1], "slower must emit less"
    assert slow.objectives[0] > fast.objectives[0], "slower must cost more"


def test_beta_never_breaks_the_slot():
    slow = a_plan(1.0)
    for o in slow.realised:
        assert o.sol.total_days <= o.budget_days + 1e-6
    by_v = {}
    for o in slow.realised:
        by_v.setdefault(o.vessel_id, []).append(o)
    for g in by_v.values():
        g.sort(key=lambda o: o.start)
        for a, b in zip(g, g[1:]):
            assert not a.overlaps(b), "slowing down created a double-booking"


def test_costs_use_the_real_charter_rate():
    """beta is a search knob. It must not leak into the reported cost."""
    slow = a_plan(1.0)
    for o in slow.realised:
        expected = o.sol.total_days * o.vessel.charter_rate_usd_per_day
        assert o.sol.time_cost_usd == pytest.approx(expected, rel=1e-9)


def test_dominance_and_archive():
    assert dominates([1, 1, 1], [2, 2, 2])
    assert not dominates([1, 3], [2, 2])
    F = np.array([[1, 5], [2, 3], [3, 1], [2, 4], [4, 4]], float)
    assert list(non_dominated(F)) == [True, True, True, False, False]
    arc = Archive(cap=10)
    for f in F:
        p = Plan([], np.zeros(0)); p.objectives = tuple(f)
        arc.add(p)
    assert len(arc.plans) == 3


def test_das_dennis_weights_are_a_simplex():
    W = das_dennis(6, 3)
    assert np.allclose(W.sum(1), 1.0, atol=1e-6)
    assert (W > 0).all()
    assert len(W) == 28


def test_tchebycheff_is_normalised():
    """f1 ~1e7 and f3 ~1e0. Without normalisation the front collapses onto cost."""
    z_i, z_n = np.array([0.0, 0.0, 0.0]), np.array([1e7, 1e4, 10.0])
    w = np.array([1 / 3, 1 / 3, 1 / 3])
    a = tchebycheff(np.array([1e7, 0.0, 0.0]), w, z_i, z_n)
    b = tchebycheff(np.array([0.0, 0.0, 10.0]), w, z_i, z_n)
    assert a == pytest.approx(b), "an objective must not dominate by unit alone"


def test_qpso_contracts_and_stays_in_bounds():
    rng = np.random.default_rng(0)
    assert qpso.contraction(0, 10) > qpso.contraction(9, 10)
    x = rng.random(20)
    for t in range(10):
        x = qpso.sample(x, rng.random(20), rng.random(20), rng.random(20),
                        qpso.contraction(t, 10), rng)
        assert x.min() >= 0.0 and x.max() <= 1.0


def test_hypervolume_needs_a_shared_box():
    """A single point scores 1.0 against its own degenerate box. That is how a
    one-shot solver ends up appearing to beat a real Pareto front."""
    front = np.array([[0.0, 1.0], [0.5, 0.5], [1.0, 0.0]])
    single = np.array([[0.9, 0.9]])
    ideal, ref = np.array([0.0, 0.0]), np.array([1.2, 1.2])
    assert hypervolume(single) == pytest.approx(1.0, abs=0.01)      # meaningless
    assert hypervolume(front, ref=ref, ideal=ideal) > \
           hypervolume(single, ref=ref, ideal=ideal)                # meaningful


def test_indicators_behave():
    good = np.array([[0.0, 1.0], [0.5, 0.5], [1.0, 0.0]])
    worse = good + 0.2
    ideal, ref = np.array([0.0, 0.0]), np.array([1.5, 1.5])
    assert hypervolume(good, ref=ref, ideal=ideal) > hypervolume(worse, ref=ref, ideal=ideal)
    assert igd_plus(good, good) == pytest.approx(0.0, abs=1e-9)
    assert igd_plus(worse, good) > 0
    assert spacing(good) >= 0.0
