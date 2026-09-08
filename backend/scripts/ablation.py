"""Which components actually earn their place? Run this before claiming any do.

    python scripts/ablation.py [--budget=30] [--seeds=3]
"""
import sys, os, warnings
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
warnings.filterwarnings("ignore")
import numpy as np

from fleetopt.io.loader import load_instance
from fleetopt.master.option_gen import build_options
from fleetopt.outer import sms_emoa as SE, moead_awa as MO
from fleetopt.benchmark.indicators import hypervolume

B = float(next((a.split("=")[1] for a in sys.argv if a.startswith("--budget=")), 30))
S = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--seeds=")), 3))

inst = load_instance("data", scenario="BASE")
mand = {p.parcel_id: p.mandatory for p in inst.parcels.values()}
opts = build_options(inst, k_routes=3)
print(f"{len(opts)} options | {S} seeds x {B:.0f} s per configuration\n")

CFG = {
    "SMS-EMOA + SBX  + dSB":   dict(use_qpso=False, use_dsb_seeding=True),
    "SMS-EMOA + QPSO + dSB":   dict(use_qpso=True,  use_dsb_seeding=True),
    "SMS-EMOA + QPSO, random": dict(use_qpso=True,  use_dsb_seeding=False),
    "SMS-EMOA + SBX,  random": dict(use_qpso=False, use_dsb_seeding=False),
}
res = {}
for name, kw in CFG.items():
    res[name] = [SE.run(inst, opts, mand, 60, B, s + 1, verbose=False, **kw)
                 for s in range(S)]
    print(f"  ran {name}")
res["MOEA/D-AWA (old L3)"] = [
    MO.run(inst, opts, mand, n_weights=16, generations=10_000, seed=s + 1,
           verbose=False, max_seconds=B, dsb_agents=8, dsb_steps=250,
           stagnation=20) for s in range(S)]
print("  ran MOEA/D-AWA (old L3)\n")

allF = np.vstack([r.archive.F for rs in res.values() for r in rs if len(r.archive.F)])
I = allF.min(0)
R = allF.max(0) + np.abs(allF.max(0)) * 0.05 + 1e-9

print(f"  {'configuration':28s} {'HV median [IQR]':>26s} {'pts':>6s} {'evals':>7s}")
base = None
for name, rs in res.items():
    hv = np.array([hypervolume(r.archive.F, ref=R, ideal=I, seed=7) for r in rs])
    q1, md, q3 = np.percentile(hv, 25), np.median(hv), np.percentile(hv, 75)
    d = "" if base is None else f"  {100*(md-base)/base:+5.1f}%"
    if base is None:
        base = md
    print(f"  {name:28s} {md:8.4f} [{q1:.4f},{q3:.4f}] "
          f"{np.median([len(r.archive.plans) for r in rs]):6.0f} "
          f"{np.median([r.n_evals for r in rs]):7.0f}{d}")
print("\n  Percentages are relative to the first row. Report the configuration")
print("  that produced any number you publish.")
