"""M5: the full Pareto front over cost, CO2e and lateness.

    python scripts/demo_m5.py [--quick]
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np

from fleetopt.io.loader import load_instance
from fleetopt.master.option_gen import build_options
from fleetopt.master.qubo import build_qubo, decode, repair_solution
from fleetopt.master.dsb import solve_qubo
from fleetopt.outer import moead_awa as MO
from fleetopt.outer.plan import make_plan
from fleetopt.outer.archive import non_dominated
from fleetopt.benchmark.baselines import bau_schedule
from fleetopt.benchmark.indicators import summary, hypervolume, igd_plus

QUICK = "--quick" in sys.argv
bar = "=" * 78
inst = load_instance("data", scenario="BASE")
mandatory = {p.parcel_id: p.mandatory for p in inst.parcels.values()}
options = build_options(inst, k_routes=3)
print(f"{len(options)} priced options | {len(inst.parcels)} parcels | "
      f"{len(inst.vessels)} vessels")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("REFERENCE POINTS"); print(bar)
bau = make_plan(inst, options, repair_solution(bau_schedule(inst, options),
                                               options, mandatory), 0.0)
def line(name, pl):
    print(f"  {name:12s} margin ${-pl.objectives[0]:>12,.0f}  "
          f"CO2e {pl.objectives[1]:>8,.0f} t  served {pl.ev.n_served:2d}/24  "
          f"{pl.co2_intensity:6.1f} g/t-mi")
line("BAU", bau)
singles = {}
for name, w in [("cost-only", (1, 0, 0)), ("CO2-only", (0, 1, 0))]:
    Q, _, _ = build_qubo(options, mandatory, weights=w)
    r = solve_qubo(Q, agents=64, steps=2000, seed=1)
    pl = make_plan(inst, options, repair_solution(decode(r.x, options), options,
                                                  mandatory),
                   0.0 if name == "cost-only" else 1.0)
    singles[name] = pl
    line(name, pl)

# --------------------------------------------------------------------------- #
print("\n" + bar); print("M5  MOEA/D-AWA + QPSO + dSB"); print(bar)
res = MO.run(inst, options, mandatory,
             n_weights=36 if QUICK else 66,
             generations=6 if QUICK else 20,
             awa_every=3 if QUICK else 8,
             dsb_agents=32 if QUICK else 48,
             dsb_steps=800 if QUICK else 1200,
             seed=1, verbose=True)
F = res.archive.F
print(f"\n  {len(res.archive.plans)} archive points | {res.n_dsb_calls} dSB calls "
      f"| {res.n_evals} evaluations | {res.seconds:.1f} s")
print(f"  dSB calls are {100*res.n_dsb_calls/max(res.n_evals,1):.0f}% of evaluations "
      f"-- the rest are cheap inner re-solves under the QPSO speed policy")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("PARETO FRONT  (cost vs CO2e, lateness folded in)"); print(bar)
nd = F[non_dominated(F)]
order = np.argsort(nd[:, 0])
plans_nd = [res.archive.plans[i] for i in np.flatnonzero(non_dominated(F))]
plans_nd = [plans_nd[i] for i in np.argsort([p.objectives[0] for p in plans_nd])]
print(f"  {'margin $':>13s} {'CO2e t':>9s} {'served':>7s} {'g/t-mi':>8s} "
      f"{'late d':>7s}   vs cheapest")
sel = np.linspace(0, len(plans_nd) - 1, min(12, len(plans_nd))).astype(int)
p0 = plans_nd[0]
for i in sel:
    p = plans_nd[i]
    dm = (-p.objectives[0] + p0.objectives[0]) / abs(p0.objectives[0]) * 100
    de = (p.objectives[1] - p0.objectives[1]) / p0.objectives[1] * 100
    print(f"  {-p.objectives[0]:13,.0f} {p.objectives[1]:9,.0f} "
          f"{p.ev.n_served:5d}/24 {p.co2_intensity:8.1f} {p.objectives[2]:7.1f} "
          f"   margin {dm:+6.1f}%  CO2 {de:+6.1f}%")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("KNEE POINT"); print(bar)
lo, hi = nd.min(0), nd.max(0)
span = np.where(hi - lo < 1e-12, 1.0, hi - lo)
Z = (nd - lo) / span
knee = int(np.argmin(np.linalg.norm(Z, axis=1)))
best_cost = int(np.argmin(nd[:, 0])); best_co2 = int(np.argmin(nd[:, 1]))
for label, i in [("cheapest", best_cost), ("knee", knee), ("greenest", best_co2)]:
    print(f"  {label:10s} margin ${-nd[i,0]:>12,.0f}   CO2e {nd[i,1]:>8,.0f} t   "
          f"late {nd[i,2]:4.1f} d")
dm = (-nd[knee, 0]) - (-nd[best_cost, 0])
de = nd[knee, 1] - nd[best_cost, 1]
print(f"\n  Moving from cheapest to the knee: margin {dm/abs(nd[best_cost,0])*100:+.1f}%, "
      f"CO2e {de/nd[best_cost,1]*100:+.1f}%")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("INDICATORS"); print(bar)
ref_pts = np.vstack([F, [bau.objectives], [p.objectives for p in singles.values()]])
ref_nd = ref_pts[non_dominated(ref_pts)]
# ONE shared box for every method, or the numbers cannot be compared
IDEAL = ref_pts.min(0)
REF = ref_pts.max(0) + np.abs(ref_pts.max(0)) * 0.05 + 1e-9
for name, pts in [("MOEA/D-AWA", F),
                  ("cost-only dSB", np.array([singles["cost-only"].objectives])),
                  ("CO2-only dSB", np.array([singles["CO2-only"].objectives])),
                  ("BAU", np.array([bau.objectives]))]:
    s = summary(pts, ref_nd, ideal=IDEAL, ref=REF)
    print(f"  {name:16s} points {s['n_points']:4d}  HV {s['hypervolume']:.4f}  "
          f"IGD+ {s.get('igd_plus', float('nan')):.4f}  "
          f"spacing {s['spacing']:.4f}")
print("  HV is Monte Carlo over 200k samples, seeded. A single-point method")
print("  cannot score well on HV by construction -- that is the point.")

print("\n" + bar); print("ANYTIME CURVE  (front quality vs wall clock)"); print(bar)
for t, sp, n in res.history[::max(1, len(res.history) // 8)]:
    print(f"  {t:7.1f} s   archive {n:3d}   spread {sp:9.2f}")
