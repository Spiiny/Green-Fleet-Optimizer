"""Does the bilevel quantum-inspired method scale better than an off-the-shelf EA?

M6 found that at 24 parcels, NSGA-III and SMS-EMOA BEAT our method at equal wall
clock. The obvious hypothesis is that the instance is too small: once options are
pre-enumerated, repaired and exactly priced, the remaining combinatorial problem
is 24 choices over ~35 alternatives, and a random-key EA with several thousand
evaluations covers that comfortably. dSB's advantage -- thousands of coupled
binaries advancing simultaneously -- has nothing to bite on.

This script tests that directly by cloning the parcel set with shifted laycans
and watching how the ranking moves with size. Either outcome is a real result:
a crossover point is the scaling argument, and no crossover means the approach
is not justified for problems of this shape, which is worth knowing before you
build a pitch around it.

    python scripts/scaling_probe.py [--sizes 24,48,96]
"""
import sys, os, time, copy
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dataclasses import replace
from datetime import timedelta
import numpy as np

from fleetopt.io.loader import load_instance
from fleetopt.master.option_gen import build_options
from fleetopt.outer import moead_awa as MO
from fleetopt.benchmark import runner as R
from fleetopt.benchmark.indicators import hypervolume
from fleetopt.outer.archive import non_dominated

SIZES = [24, 48, 96]
for a in sys.argv:
    if a.startswith("--sizes"):
        SIZES = [int(x) for x in a.split("=")[-1].split(",")]
BUDGET = float(next((a.split("=")[-1] for a in sys.argv if a.startswith("--budget")), 30))
bar = "=" * 78


def scale_instance(base, target_parcels: int):
    """Clone parcels with shifted laycans and a matching vessel pool.

    Fleet grows with demand so the instance stays feasible; what grows fastest
    is the number of (parcel, vessel, route, fuel, bunker) combinations, which
    is precisely the quantity dSB is supposed to handle well.
    """
    inst = copy.copy(base)
    inst.parcels = dict(base.parcels)
    inst.vessels = dict(base.vessels)
    inst.vessel_fuels = dict(base.vessel_fuels)
    inst.vessel_cargo = dict(base.vessel_cargo)
    originals = list(base.parcels.values())
    k = 0
    while len(inst.parcels) < target_parcels:
        src = originals[k % len(originals)]
        gen = k // len(originals) + 1
        shift = timedelta(days=3 * gen)
        pid = f"{src.parcel_id}x{gen}"
        inst.parcels[pid] = replace(
            src, parcel_id=pid, laycan_start=src.laycan_start + shift,
            laycan_end=src.laycan_end + shift,
            delivery_deadline=src.delivery_deadline + shift)
        k += 1
    # grow the fleet proportionally, staggering availability
    ratio = target_parcels / len(base.parcels)
    vessels = list(base.vessels.values())
    j = 0
    while len(inst.vessels) < int(len(base.vessels) * ratio):
        src = vessels[j % len(vessels)]
        gen = j // len(vessels) + 1
        vid = f"{src.vessel_id}x{gen}"
        inst.vessels[vid] = replace(
            src, vessel_id=vid, vessel_name=f"{src.vessel_name} {gen+1}",
            available_from=src.available_from + timedelta(days=2 * gen))
        inst.vessel_fuels[vid] = list(base.vessel_fuels[src.vessel_id])
        inst.vessel_cargo[vid] = list(base.vessel_cargo[src.vessel_id])
        j += 1
    return inst


print(bar); print("SCALING PROBE"); print(bar)
print(f"  sizes {SIZES} | {BUDGET:.0f} s per method per size | 2 seeds")
print( "  Hypothesis: our method's standing improves with instance size, because")
print( "  dSB needs a search space large enough to justify its per-call cost.\n")

base = load_instance("data", scenario="BASE")
results = []

for size in SIZES:
    inst = scale_instance(base, size)
    mand = {p.parcel_id: p.mandatory for p in inst.parcels.values()}
    t = time.perf_counter()
    options = build_options(inst, k_routes=3, cache_dir=None)
    print(f"  n={size:3d} parcels | {len(inst.vessels):3d} vessels | "
          f"{len(options):5d} options | built in {time.perf_counter()-t:.1f} s")

    fronts = {}
    for name in ["MOEA/D-AWA (ours)", "SMS-EMOA", "NSGA-III"]:
        Fs, secs, ev = [], [], []
        for seed in (1, 2):
            if name == "MOEA/D-AWA (ours)":
                res = MO.run(inst, options, mand, n_weights=16,
                             generations=10_000, seed=seed, verbose=False,
                             max_seconds=BUDGET, dsb_agents=8, dsb_steps=250,
                             stagnation=20)
                F, s, e = res.archive.F, res.seconds, res.n_evals
            else:
                r = R.run_pymoo(name, inst, options, mand, seed, BUDGET)
                F, s, e = r.F, r.seconds, r.n_evals
            Fs.append(F); secs.append(s); ev.append(e)
        fronts[name] = (np.vstack([f for f in Fs if len(f)]), np.mean(ev))

    allF = np.vstack([v[0] for v in fronts.values()])
    IDEAL = allF.min(0)
    REF = allF.max(0) + np.abs(allF.max(0)) * 0.05 + 1e-9
    row = {"n": size, "options": len(options)}
    for name, (F, ev) in fronts.items():
        row[name] = hypervolume(F, ref=REF, ideal=IDEAL, seed=7)
        row[name + "_ev"] = ev
    results.append(row)
    print(f"       " + "  ".join(f"{k.replace(' (ours)','')} {row[k]:.4f}"
                                 for k in fronts))

print("\n" + bar); print("RESULT"); print(bar)
print(f"  {'parcels':>8s} {'options':>8s} {'ours':>9s} {'SMS-EMOA':>10s} "
      f"{'NSGA-III':>10s} {'ours rank':>10s}")
for r in results:
    vals = {k: r[k] for k in ["MOEA/D-AWA (ours)", "SMS-EMOA", "NSGA-III"]}
    rank = 1 + sum(1 for k, v in vals.items()
                   if k != "MOEA/D-AWA (ours)" and v > r["MOEA/D-AWA (ours)"])
    print(f"  {r['n']:8d} {r['options']:8d} {r['MOEA/D-AWA (ours)']:9.4f} "
          f"{r['SMS-EMOA']:10.4f} {r['NSGA-III']:10.4f} {rank:10d}")
print("\n  If 'ours rank' improves as parcels grow, the scaling argument holds")
print("  and you should say so with these numbers. If it does not, say that")
print("  instead -- a negative result you found yourself is worth more than a")
print("  positive one a reviewer overturns.")
