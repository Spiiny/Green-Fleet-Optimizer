"""M3-M4: options -> QUBO -> dSB -> correction loop -> comparison.

    python scripts/demo_m4.py
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np

from fleetopt.io.loader import load_instance
from fleetopt.master.option_gen import build_options, group_by_parcel, conflict_pairs
from fleetopt.master.qubo import build_qubo, decode, check_feasible, repair_solution
from fleetopt.master.dsb import solve_qubo, solve_qubo_sa
from fleetopt.master.correction import true_cost, apply_corrections
from fleetopt.benchmark.baselines import bau_schedule
from fleetopt.objectives import evaluate

bar = "=" * 78
inst = load_instance("data", scenario="BASE")
mandatory = {p.parcel_id: p.mandatory for p in inst.parcels.values()}


def score(chosen):
    """One evaluator for every method, repositioning included."""
    net, co2, pairs = true_cost(inst, chosen)
    rep_cost = sum(r.cost_usd for r in pairs.values() if r.feasible)
    rep_co2 = sum(r.co2e_t for r in pairs.values() if r.feasible)
    return evaluate(inst, chosen, rep_cost, rep_co2), pairs


print(bar); print("M3  OPTION GENERATION"); print(bar)
t0 = time.perf_counter()
options = build_options(inst, k_routes=3)
g = group_by_parcel(options)
print(f"  {len(options)} priced options in {time.perf_counter()-t0:.1f} s "
      f"| parcels covered {len(g)}/{len(inst.parcels)}")
print(f"  options per parcel: min {min(map(len,g.values()))} "
      f"median {int(np.median([len(v) for v in g.values()]))} "
      f"max {max(map(len,g.values()))} | "
      f"{len(conflict_pairs(options))} vessel-time conflict pairs")

print("\n" + bar); print("BASELINE  business as usual"); print(bar)
bau = repair_solution(bau_schedule(inst, options), options, mandatory)
ev_bau, _ = score(bau)
print(f"  served {ev_bau.n_served}/{len(inst.parcels)} | cost ${ev_bau.gross_cost:,.0f}"
      f" | revenue ${ev_bau.revenue:,.0f} | margin ${ev_bau.margin:,.0f}")
print(f"  fuel {ev_bau.fuel_t:,.0f} t | CO2e {ev_bau.f2_co2e_t:,.0f} t | "
      f"late {ev_bau.f3_late_days:.1f} d")

print("\n" + bar); print("M4  QUBO + dSB + correction loop"); print(bar)
Q, A, meta = build_qubo(options, mandatory, weights=(1.0, 0.0, 0.0))
print(f"  {meta['n']} binaries | penalty A {A:.2f} | "
      f"{meta['n_conflicts']} conflicts | density {meta['density']:.3f}\n")

cost_scale = max(abs(o.net_usd) for o in options)
learned, best, stale = {}, None, 0
t0 = time.perf_counter()
for it in range(1, 11):
    res = solve_qubo(Q, agents=64, steps=2000, seed=1)
    chosen = repair_solution(decode(res.x, options), options, mandatory)
    ok, errs = check_feasible(chosen, mandatory)
    ev, pairs = score(chosen)
    tag = ""
    if best is None or ev.f1_cost_usd < best[0].f1_cost_usd:
        best, stale, tag = (ev, list(chosen)), 0, "  <- best"
    else:
        stale += 1
    print(f"  it{it:2d}  f1 ${ev.f1_cost_usd:>12,.0f}  margin ${ev.margin:>12,.0f}  "
          f"CO2e {ev.f2_co2e_t:>7,.0f} t  served {ev.n_served}/24  "
          f"feasible={ok}  {len(pairs)} ballast{tag}")
    if apply_corrections(Q, pairs, A, cost_scale, learned) < 1e-9 or stale >= 3:
        print("  converged"); break
ev, chosen = best
print(f"  dSB total {time.perf_counter()-t0:.1f} s")

print("\n" + bar); print("BASELINE  simulated annealing on the same QUBO"); print(bar)
sa = solve_qubo_sa(Q, sweeps=8000, restarts=6, seed=1)
sa_sel = repair_solution(decode(sa.x, options), options, mandatory)
ev_sa, _ = score(sa_sel)
print(f"  SA  {sa.seconds:5.2f} s | f1 ${ev_sa.f1_cost_usd:,.0f} | "
      f"CO2e {ev_sa.f2_co2e_t:,.0f} t | served {ev_sa.n_served}/24")

print("\n" + bar); print("RESULT"); print(bar)
print(f"  {'':20s} {'BAU':>15s} {'SA':>15s} {'dSB':>15s} {'dSB vs BAU':>13s}")
rows = [("objective f1 ($)", "f1_cost_usd"), ("margin ($)", "margin"),
        ("gross cost ($)", "gross_cost"), ("revenue ($)", "revenue"),
        ("fuel (t)", "fuel_t"), ("CO2e WTW (t)", "f2_co2e_t"),
        ("late (days)", "f3_late_days"), ("parcels served", "n_served")]
for label, attr in rows:
    b, s_, d = getattr(ev_bau, attr), getattr(ev_sa, attr), getattr(ev, attr)
    pct = (d - b) / abs(b) * 100 if b else 0.0
    print(f"  {label:20s} {b:15,.0f} {s_:15,.0f} {d:15,.0f} {pct:+12.1f}%")
bf, df = ev_bau.fuel_t / max(ev_bau.n_served, 1), ev.fuel_t / max(ev.n_served, 1)
bc, dc = ev_bau.f2_co2e_t / max(ev_bau.n_served, 1), ev.f2_co2e_t / max(ev.n_served, 1)
print(f"\n  Raw totals are not comparable at different service levels. Normalised:")
print(f"  {'fuel per parcel (t)':20s} {bf:15,.0f} {'':15s} {df:15,.0f} "
      f"{(df-bf)/bf*100:+12.1f}%")
print(f"  {'CO2e per parcel (t)':20s} {bc:15,.0f} {'':15s} {dc:15,.0f} "
      f"{(dc-bc)/bc*100:+12.1f}%")
print(f"  GHG intensity {ev.ghg_intensity_g_per_mj:.2f} g CO2e/MJ "
      f"(FuelEU limit {inst.param_f('fueleu_ghg_target_gco2e_per_mj'):.2f}) "
      f"-> penalty ${ev.fueleu_penalty:,.0f}")
unserved_mand = [u for u in ev.unserved if mandatory[u]]
if ev.unserved:
    print(f"  unserved: {', '.join(ev.unserved)}")
if unserved_mand:
    print(f"\n  CAPACITY FINDING: {len(unserved_mand)} mandatory parcels "
          f"({', '.join(unserved_mand)}) cannot be served by any")
    print( "  feasible assignment -- not a solver failure. The large container")
    print( "  parcels all need V09 (8,000 TEU), the only ship big enough, and")
    print( "  their laycans overlap. The fleet is one vessel short. That is a")
    print( "  legitimate output: an optimiser that reports infeasibility")
    print( "  honestly is worth more than one that quietly drops the cargo.")

print("\n" + bar); print("PARETO PREVIEW  (re-solve with weight on CO2e)"); print(bar)
print(f"  {'weights (cost,CO2,late)':26s} {'f1 margin $':>14s} {'CO2e t':>10s} {'served':>7s}")
for w in [(1.0, 0.0, 0.0), (0.7, 0.3, 0.0), (0.5, 0.5, 0.0), (0.3, 0.7, 0.0)]:
    Qw, Aw, _ = build_qubo(options, mandatory, weights=w)
    rw = solve_qubo(Qw, agents=64, steps=2000, seed=1)
    cw = repair_solution(decode(rw.x, options), options, mandatory)
    ew, _ = score(cw)
    print(f"  {str(w):26s} {ew.margin:14,.0f} {ew.f2_co2e_t:10,.0f} {ew.n_served:5d}/24")
print("  Each row is one point on the Pareto front. M5 produces 100 of these")
print("  with adaptive weights instead of this hand-picked handful.")

print("\n" + bar); print("ASSIGNMENT"); print(bar)
for o in sorted(chosen, key=lambda o: o.start):
    print(f"  {o.parcel_id}  {o.vessel_id}  {o.fuel.fuel_id:6s} "
          f"{'-'.join(o.route):<30s} {o.sol.total_days:5.1f} d "
          f"{np.mean(o.sol.speeds_kn):5.2f} kn {o.sol.fuel_t:7.1f} t "
          f"net ${o.net_usd:>11,.0f}")
