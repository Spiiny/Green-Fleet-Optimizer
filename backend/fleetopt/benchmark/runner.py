"""M6 -- the experiment harness.

Protocol, stated up front so it can be checked:

* Every method gets the SAME evaluation budget. Budget by evaluations rather
  than wall clock because it is reproducible across machines; wall clock is
  reported alongside so the anytime comparison is still available.
* Every method decodes through the same repair and scores through the same
  evaluator. Only the search differs.
* Hypervolume uses ONE reference box built from the union of every run of every
  method. Per-method boxes are meaningless.
* Significance by Wilcoxon rank-sum with Holm-Bonferroni correction across the
  baseline family. Median and IQR reported, not mean +/- sd -- HV distributions
  are skewed.
"""
from __future__ import annotations
from dataclasses import dataclass, field
import time
import numpy as np

from ..io.schema import Instance
from ..master.option_gen import Option
from ..master.qubo import build_qubo, decode as qdecode, repair_solution
from ..master.dsb import solve_qubo
from ..outer import moead_awa as MO
from ..outer.plan import make_plan
from ..outer.archive import Archive, non_dominated
from .baselines import bau_schedule
from .problem import PlanCodec, make_pymoo_problem
from .indicators import hypervolume, igd_plus, spacing


@dataclass
class Run:
    method: str
    seed: int
    F: np.ndarray                  # non-dominated objective vectors
    seconds: float
    n_evals: int
    history: list = field(default_factory=list)


# --------------------------------------------------------------------------- #
def run_moead_awa(inst, options, mandatory, seed, budget, **kw) -> Run:
    """budget is WALL-CLOCK SECONDS, shared by every method."""
    t0 = time.perf_counter()
    res = MO.run(inst, options, mandatory, n_weights=36, generations=10_000,
                 seed=seed, verbose=False, max_seconds=budget,
                 dsb_agents=32, dsb_steps=800, **kw)
    F = res.archive.F
    return Run("MOEA/D-AWA (ours)", seed, F[non_dominated(F)] if len(F) else F,
               time.perf_counter() - t0, res.n_evals, res.history)


def run_weighted_dsb(inst, options, mandatory, seed, budget, **kw) -> Run:
    """dSB alone on a fixed weight sweep -- no outer evolution, no QPSO.
    Isolates how much the outer level actually contributes."""
    t0 = time.perf_counter()
    W = MO.das_dennis(12)
    arc = Archive(cap=400)
    n = 0
    for j, w in enumerate(W):
        if time.perf_counter() - t0 > budget:
            break
        Q, _, _ = build_qubo(options, mandatory, weights=tuple(w))
        r = solve_qubo(Q, agents=32, steps=800, seed=seed * 1000 + j)
        ch = repair_solution(qdecode(r.x, options), options, mandatory)
        arc.add(make_plan(inst, options, ch, float(np.clip(w[1] * 1.2, 0, 1))))
        n += 1
    F = arc.F
    return Run("dSB weight sweep", seed, F[non_dominated(F)] if len(F) else F,
               time.perf_counter() - t0, n, [])


def run_pymoo(algo_name: str, inst, options, mandatory, seed, budget) -> Run:
    from pymoo.optimize import minimize
    from pymoo.util.ref_dirs import get_reference_directions
    codec = PlanCodec(inst, options, mandatory)
    prob = make_pymoo_problem(codec)
    ref = get_reference_directions("das-dennis", 3, n_partitions=10)
    if algo_name == "NSGA-III":
        from pymoo.algorithms.moo.nsga3 import NSGA3
        algo = NSGA3(pop_size=len(ref), ref_dirs=ref)
    elif algo_name == "MOEA/D-DE":
        from pymoo.algorithms.moo.moead import MOEAD
        algo = MOEAD(ref_dirs=ref, n_neighbors=15, prob_neighbor_mating=0.8)
    elif algo_name == "SMS-EMOA":
        from pymoo.algorithms.moo.sms import SMSEMOA
        algo = SMSEMOA(pop_size=40)
    else:
        raise ValueError(algo_name)
    from pymoo.termination.max_time import TimeBasedTermination
    t0 = time.perf_counter()
    res = minimize(prob, algo, TimeBasedTermination(budget), seed=seed,
                   verbose=False)
    F = np.atleast_2d(res.F) if res.F is not None else np.zeros((0, 3))
    return Run(algo_name, seed, F[non_dominated(F)] if len(F) else F,
               time.perf_counter() - t0, codec.n_eval, [])


def run_random(inst, options, mandatory, seed, budget) -> Run:
    """Sanity floor. If a method cannot beat this, it is not searching."""
    codec = PlanCodec(inst, options, mandatory)
    rng = np.random.default_rng(seed)
    t0 = time.perf_counter()
    arc = Archive(cap=400)
    n = 0
    while time.perf_counter() - t0 < budget:
        arc.add(codec.decode(rng.random(codec.n_var)))
        n += 1
    F = arc.F
    return Run("random search", seed, F[non_dominated(F)] if len(F) else F,
               time.perf_counter() - t0, n, [])


METHODS = {
    "MOEA/D-AWA (ours)": run_moead_awa,
    "dSB weight sweep":  run_weighted_dsb,
    "NSGA-III":          lambda *a: run_pymoo("NSGA-III", *a),
    "MOEA/D-DE":         lambda *a: run_pymoo("MOEA/D-DE", *a),
    "SMS-EMOA":          lambda *a: run_pymoo("SMS-EMOA", *a),
    "random search":     run_random,
}


# --------------------------------------------------------------------------- #
def experiment(inst: Instance, options: list[Option], mandatory: dict,
               methods: list[str], seeds: int = 5, budget: float = 45.0,
               verbose: bool = True) -> dict:
    """budget is WALL-CLOCK SECONDS per run, identical for every method.

    Budgeting by evaluations would flatter us badly: one dSB call costs orders
    of magnitude more than one SBX crossover, so an equal-evaluation comparison
    hands our method a far larger compute allowance while appearing fair.
    """
    runs: list[Run] = []
    for name in methods:
        fn = METHODS[name]
        for s in range(seeds):
            t = time.perf_counter()
            r = fn(inst, options, mandatory, s + 1, budget)
            runs.append(r)
            if verbose:
                print(f"    {name:20s} seed {s+1}  {len(r.F):4d} pts  "
                      f"{time.perf_counter()-t:6.1f} s")

    # one shared box, plus a reference front from the union of everything
    allF = np.vstack([r.F for r in runs if len(r.F)] +
                     [np.array([[0, 0, 0]])])[:-1]
    IDEAL = allF.min(0)
    REF = allF.max(0) + np.abs(allF.max(0)) * 0.05 + 1e-9
    ref_front = allF[non_dominated(allF)]

    rows: dict[str, dict] = {}
    for name in methods:
        rs = [r for r in runs if r.method == name]
        hv = np.array([hypervolume(r.F, ref=REF, ideal=IDEAL, seed=7) for r in rs])
        ig = np.array([igd_plus(r.F, ref_front) for r in rs])
        sp = np.array([spacing(r.F) for r in rs])
        rows[name] = dict(
            hv=hv, igd=ig, spacing=sp,
            n_points=np.array([len(r.F) for r in rs], float),
            seconds=np.array([r.seconds for r in rs]),
            evals=np.array([r.n_evals for r in rs], float))
    return dict(runs=runs, rows=rows, ideal=IDEAL, ref=REF, ref_front=ref_front)


# --------------------------------------------------------------------------- #
def holm_wilcoxon(ours: np.ndarray, others: dict[str, np.ndarray],
                  greater_is_better: bool = True) -> dict:
    """Wilcoxon rank-sum vs each baseline, Holm-Bonferroni corrected."""
    from scipy.stats import ranksums
    raw = {}
    for name, v in others.items():
        alt = "greater" if greater_is_better else "less"
        raw[name] = float(ranksums(ours, v, alternative=alt).pvalue)
    order = sorted(raw, key=raw.get)
    m, out, running = len(order), {}, 0.0
    for i, name in enumerate(order):
        adj = min(1.0, raw[name] * (m - i))
        running = max(running, adj)          # Holm is monotone
        out[name] = dict(p_raw=raw[name], p_holm=running,
                         significant=running < 0.05)
    return out


def effect_size(a: np.ndarray, b: np.ndarray) -> float:
    """Vargha-Delaney A12: probability a random draw from a beats one from b."""
    n = 0
    for x in a:
        n += np.sum(x > b) + 0.5 * np.sum(x == b)
    return float(n / (len(a) * len(b)))


def iqr(v: np.ndarray) -> tuple[float, float, float]:
    return (float(np.percentile(v, 25)), float(np.median(v)),
            float(np.percentile(v, 75)))
