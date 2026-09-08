"""M6: statistical comparison against independent baselines, plus charts.

    python scripts/demo_m6.py              # 4 seeds x 45 s  (~18 min)
    python scripts/demo_m6.py --quick      # 3 seeds x 20 s  (~6 min)
    python scripts/demo_m6.py --full       # 31 seeds x 120 s (overnight)
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from fleetopt.io.loader import load_instance
from fleetopt.master.option_gen import build_options
from fleetopt.master.qubo import repair_solution
from fleetopt.benchmark import runner as R
from fleetopt.benchmark.baselines import bau_schedule
from fleetopt.benchmark.indicators import hypervolume
from fleetopt.outer.plan import make_plan
from fleetopt.outer.archive import non_dominated

QUICK, FULL = "--quick" in sys.argv, "--full" in sys.argv
SEEDS, BUDGET = (3, 20.0) if QUICK else ((31, 120.0) if FULL else (4, 45.0))
OURS = "MOEA/D-AWA (ours)"
METHODS = [OURS, "dSB weight sweep", "NSGA-III", "MOEA/D-DE", "SMS-EMOA",
           "random search"]
bar = "=" * 78

inst = load_instance("data", scenario="BASE")
mandatory = {p.parcel_id: p.mandatory for p in inst.parcels.values()}
options = build_options(inst, k_routes=3)
bau = make_plan(inst, options,
                repair_solution(bau_schedule(inst, options), options, mandatory), 0.0)

print(bar); print("PROTOCOL"); print(bar)
print(f"  {len(METHODS)} methods x {SEEDS} seeds x {BUDGET:.0f} s wall clock "
      f"= {len(METHODS)*SEEDS*BUDGET/60:.0f} min")
print( "  Budget is WALL CLOCK, not evaluations. One dSB call costs orders of")
print( "  magnitude more than one SBX crossover, so an equal-evaluation")
print( "  comparison would hand our method far more compute while looking fair.")
print( "  Every method shares the same options, the same repair, the same")
print( "  evaluator, and one hypervolume reference box.\n")

t0 = time.perf_counter()
exp = R.experiment(inst, options, mandatory, METHODS, seeds=SEEDS,
                   budget=BUDGET, verbose=True)
rows, runs = exp["rows"], exp["runs"]
print(f"\n  total {time.perf_counter()-t0:.0f} s")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("RESULTS  median [IQR] over seeds"); print(bar)
print(f"  {'method':20s} {'hypervolume':>22s} {'IGD+':>17s} {'points':>8s} "
      f"{'evals':>8s}")
for name in METHODS:
    r = rows[name]
    q1, md, q3 = R.iqr(r["hv"])
    i1, imd, i3 = R.iqr(r["igd"])
    print(f"  {name:20s} {md:8.4f} [{q1:.4f},{q3:.4f}] "
          f"{imd:7.4f} [{i1:.3f},{i3:.3f}] {np.median(r['n_points']):8.0f} "
          f"{np.median(r['evals']):8.0f}")
hv_bau = hypervolume(np.array([bau.objectives]), ref=exp["ref"], ideal=exp["ideal"])
print(f"  {'BAU (single point)':20s} {hv_bau:8.4f}")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("SIGNIFICANCE  Wilcoxon rank-sum, Holm-corrected"); print(bar)
others = {n: rows[n]["hv"] for n in METHODS if n != OURS}
tests = R.holm_wilcoxon(rows[OURS]["hv"], others, greater_is_better=True)
print(f"  {'vs baseline':20s} {'p (raw)':>10s} {'p (Holm)':>10s} {'A12':>7s}  verdict")
for name, t in tests.items():
    a12 = R.effect_size(rows[OURS]["hv"], rows[name]["hv"])
    v = "significant" if t["significant"] else "not significant"
    print(f"  {name:20s} {t['p_raw']:10.4f} {t['p_holm']:10.4f} {a12:7.2f}  {v}")
if SEEDS < 10:
    print(f"\n  NOTE: {SEEDS} seeds cannot reach p<0.05 on a rank-sum test "
          f"(min attainable p is ~{2/__import__("math").comb(2*SEEDS, SEEDS):.3f}).")
    print( "  Read A12 instead -- it is the effect size and does not need a")
    print( "  large sample. Run --full for 31 seeds before claiming significance.")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("CHARTS"); print(bar)
os.makedirs("figures", exist_ok=True)
COL = {OURS: "#1b6ca8", "dSB weight sweep": "#e07b39", "NSGA-III": "#4a9d5f",
       "MOEA/D-DE": "#9b59b6", "SMS-EMOA": "#c0392b", "random search": "#7f8c8d"}

# 1. Pareto scatter
best = max((r for r in runs if r.method == OURS),
           key=lambda r: hypervolume(r.F, ref=exp["ref"], ideal=exp["ideal"], seed=7))
fig, ax = plt.subplots(figsize=(7.2, 5))
for name in METHODS:
    F = np.vstack([r.F for r in runs if r.method == name and len(r.F)])
    F = F[non_dominated(F)]
    ax.scatter(-F[:, 0] / 1e6, F[:, 1] / 1e3, s=26 if name == OURS else 14,
               alpha=0.85 if name == OURS else 0.45, c=COL[name], label=name,
               zorder=3 if name == OURS else 2)
ax.scatter([-bau.objectives[0] / 1e6], [bau.objectives[1] / 1e3], marker="*",
           s=280, c="black", label="business as usual", zorder=5)
ax.set_xlabel("margin  ($M, higher is better)")
ax.set_ylabel("well-to-wake CO$_2$e  (kt, lower is better)")
ax.set_title("Pareto fronts, union over seeds")
ax.grid(alpha=0.25); ax.legend(fontsize=8, loc="upper left")
fig.tight_layout(); fig.savefig("figures/pareto.png", dpi=160); plt.close(fig)

# 2. anytime hypervolume
fig, ax = plt.subplots(figsize=(7.2, 4.2))
for r in runs:
    if r.method != OURS or not r.history:
        continue
    t = [h[0] for h in r.history]; sp = [h[1] for h in r.history]
    ax.plot(t, sp, c=COL[OURS], alpha=0.6, lw=1.4)
ax.set_xlabel("wall clock (s)"); ax.set_ylabel("front spread (proxy)")
ax.set_title("Anytime behaviour — front quality vs wall clock")
ax.grid(alpha=0.25)
fig.tight_layout(); fig.savefig("figures/anytime.png", dpi=160); plt.close(fig)

# 3. hypervolume distribution
fig, ax = plt.subplots(figsize=(7.2, 4.2))
data = [rows[n]["hv"] for n in METHODS]
bp = ax.boxplot(data, labels=[n.replace(" (ours)", "") for n in METHODS],
                patch_artist=True, widths=0.6)
for patch, n in zip(bp["boxes"], METHODS):
    patch.set_facecolor(COL[n]); patch.set_alpha(0.65)
ax.axhline(hv_bau, ls="--", c="black", lw=1, label="business as usual")
ax.set_ylabel("hypervolume"); ax.set_title(f"Hypervolume over {SEEDS} seeds "
                                           f"({BUDGET:.0f} s budget each)")
ax.tick_params(axis="x", rotation=18); ax.grid(alpha=0.25, axis="y"); ax.legend(fontsize=8)
fig.tight_layout(); fig.savefig("figures/hypervolume.png", dpi=160); plt.close(fig)

# 4. the operator-facing chart
fig, ax = plt.subplots(figsize=(7.2, 4.6))
F = best.F[np.argsort(best.F[:, 0])]
ax.plot(-F[:, 0] / 1e6, F[:, 1] / 1e3, "-o", ms=4, c=COL[OURS])
lo, hi = F.min(0), F.max(0)
Z = (F - lo) / np.where(hi - lo < 1e-12, 1.0, hi - lo)
k = int(np.argmin(np.linalg.norm(Z, axis=1)))
ax.scatter([-F[k, 0] / 1e6], [F[k, 1] / 1e3], s=200, facecolors="none",
           edgecolors="crimson", lw=2, zorder=5)
ax.annotate("knee", (-F[k, 0] / 1e6, F[k, 1] / 1e3), textcoords="offset points",
            xytext=(12, 10), color="crimson", fontweight="bold")
ax.set_xlabel("margin ($M)"); ax.set_ylabel("CO$_2$e (kt)")
ax.set_title("The decision an operator actually faces")
ax.grid(alpha=0.25)
fig.tight_layout(); fig.savefig("figures/tradeoff.png", dpi=160); plt.close(fig)

for f in ["pareto", "anytime", "hypervolume", "tradeoff"]:
    print(f"  figures/{f}.png")
