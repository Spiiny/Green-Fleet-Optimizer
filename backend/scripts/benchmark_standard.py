"""Standard-benchmark comparison: accuracy, convergence speed, quality, scaling.

    python scripts/benchmark_standard.py            # 31 seeds  (the real run)
    python scripts/benchmark_standard.py --quick    # 7 seeds
    python scripts/benchmark_standard.py --seeds=15 --evals=8000

Everything except our QPSO operator is pymoo's own code, so this compares
SEARCH STRATEGIES rather than implementation quality.
"""
import sys, os, time, json, itertools
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import warnings
warnings.filterwarnings("ignore")

from pymoo.optimize import minimize
from pymoo.problems import get_problem
from pymoo.util.ref_dirs import get_reference_directions
from pymoo.indicators.igd_plus import IGDPlus
from pymoo.core.callback import Callback
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.algorithms.moo.nsga3 import NSGA3
from pymoo.algorithms.moo.moead import MOEAD
from pymoo.algorithms.moo.sms import SMSEMOA

from fleetopt.benchmark.standard_ops import make_ours
from fleetopt.benchmark.indicators import summary, header, DIRECTION

QUICK = "--quick" in sys.argv
SEEDS = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--seeds=")),
                 7 if QUICK else 31))
EVALS = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--evals=")),
                 8000 if QUICK else 25000))
PROBLEMS = ["zdt1", "zdt2", "zdt3", "dtlz1", "dtlz2"]
TARGET = 1e-3
OURS = "Ours (SMS-EMOA+QPSO)"
bar = "=" * 92

# reference points for HV, fixed per problem, shared by every algorithm
REF = {"zdt1": np.array([1.1, 1.1]), "zdt2": np.array([1.1, 1.1]),
       "zdt3": np.array([1.1, 1.1]),
       "dtlz1": np.array([1.0, 1.0, 1.0]), "dtlz2": np.array([2.0, 2.0, 2.0])}


def n_obj(name):
    return 3 if name.startswith("dtlz") else 2


def build(name, prob, pop=100):
    m = prob.n_obj
    if name == OURS:
        return make_ours(pop_size=pop)
    if name == "NSGA-II":
        return NSGA2(pop_size=pop)
    if name == "NSGA-III":
        rd = get_reference_directions("das-dennis", m, n_partitions=99 if m == 2 else 12)
        return NSGA3(pop_size=len(rd), ref_dirs=rd)
    if name == "MOEA/D":
        rd = get_reference_directions("das-dennis", m, n_partitions=99 if m == 2 else 12)
        return MOEAD(ref_dirs=rd, n_neighbors=15, prob_neighbor_mating=0.7)
    if name == "SMS-EMOA (SBX)":
        return SMSEMOA(pop_size=pop)
    raise ValueError(name)


ALGOS = [OURS, "NSGA-II", "NSGA-III", "MOEA/D", "SMS-EMOA (SBX)", "random search"]


class Tracker(Callback):
    """Records IGD+ against the true front every generation, for the
    convergence-speed metric."""
    def __init__(self, pf):
        super().__init__()
        self.ind = IGDPlus(pf)
        self.trace = []          # (n_eval, igd_plus)

    def notify(self, algorithm):
        F = algorithm.opt.get("F") if algorithm.opt is not None else None
        if F is None or len(F) == 0:
            return
        self.trace.append((algorithm.evaluator.n_eval, float(self.ind(F))))


def run_random(prob, pf, seed, evals):
    rng = np.random.default_rng(seed)
    t0 = time.perf_counter()
    X = rng.random((evals, prob.n_var)) * (prob.xu - prob.xl) + prob.xl
    F = prob.evaluate(X)
    from pymoo.util.nds.non_dominated_sorting import NonDominatedSorting
    nd = NonDominatedSorting().do(F, only_non_dominated_front=True)
    return F[nd], time.perf_counter() - t0, [(evals, float(IGDPlus(pf)(F[nd])))]


def one_run(algo_name, prob_name, seed, evals, n_var=None):
    prob = get_problem(prob_name, n_var=n_var) if n_var else get_problem(prob_name)
    pf = prob.pareto_front(get_reference_directions("das-dennis", 3, n_partitions=12)) \
        if prob.n_obj == 3 else prob.pareto_front()
    if algo_name == "random search":
        F, secs, trace = run_random(prob, pf, seed, evals)
    else:
        algo = build(algo_name, prob)
        cb = Tracker(pf)
        t0 = time.perf_counter()
        res = minimize(prob, algo, ("n_evals", evals), seed=seed,
                       callback=cb, verbose=False)
        secs = time.perf_counter() - t0
        F = np.atleast_2d(res.F) if res.F is not None else np.zeros((0, prob.n_obj))
        trace = cb.trace
    s = summary(F, reference=pf, ideal=np.zeros(prob.n_obj), ref=REF[prob_name]) \
        if len(F) else dict(gd=np.inf, igd=np.inf, igd_plus=np.inf,
                            hypervolume=0.0, spacing=np.inf, spread=np.inf)
    hit = next((n for n, v in trace if v < TARGET), None)
    s.update(secs=secs, hit=hit, n_pts=len(F))
    return s


def stat(v):
    v = np.asarray([x for x in v if np.isfinite(x)], float)
    if len(v) == 0:
        return (float("nan"),) * 3
    return (float(np.percentile(v, 25)), float(np.median(v)),
            float(np.percentile(v, 75)))


def fmt(q1, md, q3, p=4):
    return f"{md:.{p}f} [{q1:.{p}f},{q3:.{p}f}]"


# --------------------------------------------------------------------------- #
print(bar)
print("STANDARD-BENCHMARK COMPARISON")
print(bar)
print(f"  {len(ALGOS)} algorithms x {len(PROBLEMS)} problems x {SEEDS} seeds "
      f"x {EVALS} evaluations")
print( "  SCOPE: this measures the L3 SEARCH LAYER only. ZDT/DTLZ have no hard")
print( "  constraints and no non-linear physics, so L0 (repair decoder) and L1")
print( "  (exact convex speed solve) -- the architecture's actual differentiators")
print( "  -- cannot be exercised here. Read alongside the maritime table.")
print( "  All algorithms are pymoo's own implementations; only the QPSO variation")
print( "  operator is ours, so this compares strategies, not code quality.\n")

results = {}
t_start = time.perf_counter()
for prob_name in PROBLEMS:
    for algo_name in ALGOS:
        runs = []
        for s in range(SEEDS):
            try:
                runs.append(one_run(algo_name, prob_name, s + 1, EVALS))
            except Exception as e:
                print(f"    !! {algo_name}/{prob_name}/seed{s+1}: {e}")
        results[(prob_name, algo_name)] = runs
        md = stat([r["igd_plus"] for r in runs])[1]
        print(f"    {prob_name:6s} {algo_name:22s} IGD+ {md:.5f}  "
              f"{np.median([r['secs'] for r in runs]):5.1f} s")
print(f"\n  elapsed {time.perf_counter()-t_start:.0f} s")

# --------------------------------------------------------------------------- #
print("\n" + bar)
print("INDICATOR SUITE   median over seeds.   v = lower is better, ^ = higher")
print(bar)
print("  GD      v  convergence only -- a single perfect point scores 0")
print("  IGD     v  convergence + coverage, not Pareto compliant")
print("  IGD+    v  Pareto-compliant IGD -- the one to lead with")
print("  HV      ^  Pareto compliant, shared reference point per problem")
print("  Spacing v  gap uniformity only -- ignores extent")
print("  Spread  v  Delta: uniformity AND reach to the extremes")

METRICS = ["gd", "igd", "igd_plus", "hypervolume", "spacing", "spread"]
for p in PROBLEMS:
    print("\n  " + "-" * 88)
    print(f"  {p.upper()}   (reference point {list(REF[p])})")
    print("  " + "-" * 88)
    print(f"  {'algorithm':24s}" + "".join(f"{header(m):>11s}" for m in METRICS)
          + f"{'pts':>6s}{'s':>7s}")
    for a in ALGOS:
        rs = results[(p, a)]
        row = f"  {a:24s}"
        for m in METRICS:
            v = stat([r[m] for r in rs])[1]
            row += f"{v:11.5f}" if np.isfinite(v) else f"{'--':>11s}"
        row += f"{np.median([r['n_pts'] for r in rs]):6.0f}"
        row += f"{np.median([r['secs'] for r in rs]):7.1f}"
        print(row)

print("\n" + bar)
print("BEST PER METRIC   (who wins what)")
print(bar)
print(f"  {'problem':10s}" + "".join(f"{header(m):>18s}" for m in METRICS))
for p in PROBLEMS:
    row = f"  {p:10s}"
    for m in METRICS:
        vals = {a: stat([r[m] for r in results[(p, a)]])[1] for a in ALGOS}
        vals = {k: v for k, v in vals.items() if np.isfinite(v)}
        if not vals:
            row += f"{'--':>18s}"; continue
        pick = (max if DIRECTION[m] == "higher" else min)(vals, key=vals.get)
        row += f"{pick.replace(' (SMS-EMOA+QPSO)','*').replace(' search',''):>18s}"
    print(row)
print("  * = ours")

print("\n" + bar); print("CONVERGENCE SPEED   evaluations to reach IGD+ < 1e-3  "
                         "(-- = never reached)")
print(bar)
hdr = f"  {'algorithm':24s}" + "".join(f"{p:>22s}" for p in PROBLEMS)
print(hdr)
for a in ALGOS:
    row = f"  {a:24s}"
    for p in PROBLEMS:
        hits = [r["hit"] for r in results[(p, a)] if r["hit"] is not None]
        n = len(results[(p, a)])
        row += f"{'--':>22s}" if not hits else f"{int(np.median(hits)):>15,d} ({len(hits)}/{n})"
    print(row)

# --------------------------------------------------------------------------- #
print("\n" + bar); print("SCALABILITY   ZDT1 with n = 10, 30, 100 decision variables")
print(bar)
NVARS = [10, 30, 100]
sc_seeds = max(5, SEEDS // 3)
print(f"  {sc_seeds} seeds per cell, {EVALS} evaluations")
print(f"  {'algorithm':24s}" + "".join(f"{'n='+str(n):>30s}" for n in NVARS))
print(f"  {'':24s}" + "".join(f"{'HV      IGD+     s':>30s}" for n in NVARS))
scal = {}
for a in ALGOS:
    row = f"  {a:24s}"
    for nv in NVARS:
        rs = []
        for s in range(sc_seeds):
            try:
                rs.append(one_run(a, "zdt1", s + 1, EVALS, n_var=nv))
            except Exception:
                pass
        scal[(a, nv)] = rs
        if rs:
            row += (f"{np.median([r['hypervolume'] for r in rs]):8.4f}"
                    f"{np.median([r['igd_plus'] for r in rs]):9.4f}"
                    f"{np.median([r['secs'] for r in rs]):8.1f}   ")
        else:
            row += f"{'—':>30s}"
    print(row)

print("\n" + bar); print("SCALABILITY DEGRADATION   HV retained at n=100 vs n=10")
print(bar)
for a in ALGOS:
    r10, r100 = scal.get((a, 10), []), scal.get((a, 100), [])
    if r10 and r100:
        h10 = np.median([r["hypervolume"] for r in r10])
        h100 = np.median([r["hypervolume"] for r in r100])
        t10 = np.median([r["secs"] for r in r10])
        t100 = np.median([r["secs"] for r in r100])
        print(f"  {a:24s} HV {100*h100/max(h10,1e-9):6.1f}% retained   "
              f"runtime {t100/max(t10,1e-9):5.2f}x")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("SIGNIFICANCE   Wilcoxon rank-sum on IGD+, Holm-corrected")
print(bar)
from scipy.stats import ranksums
for p in PROBLEMS:
    ours = np.array([r["igd"] for r in results[(p, OURS)]])
    raw = {}
    for a in ALGOS:
        if a == OURS:
            continue
        v = np.array([r["igd_plus"] for r in results[(p, a)]])
        raw[a] = float(ranksums(ours, v, alternative="less").pvalue)  # lower IGD better
    order = sorted(raw, key=raw.get)
    running = 0.0
    out = []
    for i, a in enumerate(order):
        running = max(running, min(1.0, raw[a] * (len(order) - i)))
        mark = "+" if running < 0.05 else ("-" if raw[a] > 0.95 else "=")
        out.append(f"{a}{mark}")
    print(f"  {p:6s}  " + "  ".join(out))
print("  + we are significantly better   - significantly worse   = no difference")

with open("benchmark_standard.json", "w") as fh:
    json.dump({f"{p}|{a}": results[(p, a)] for p in PROBLEMS for a in ALGOS},
              fh, indent=1)
print("\n  raw results -> benchmark_standard.json")
