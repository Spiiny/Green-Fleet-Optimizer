"""M0-M2 demo: load, repair, solve. Run from the repo root:

    python scripts/demo_m2.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fleetopt.io.loader import load_instance
from fleetopt.model import network as N
from fleetopt.repair.decoder import repair
from fleetopt.inner.speed_solve import solve_voyage
from fleetopt.model.emissions import co2_ttw, co2e_wtw, ets_cost_usd

inst = load_instance("data", scenario="BASE")
bar = "=" * 78

print(bar); print("INSTANCE"); print(bar)
print(f"  {len(inst.vessels)} vessels | {len(inst.ports)} ports | "
      f"{len(inst.legs)} legs | {len(inst.parcels)} parcels | scenario {inst.scenario}")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("ROUTING"); print(bar)
for a, b in [("SGSIN", "INMAA"), ("INMUN", "NLRTM"), ("OMSOH", "CNSHA")]:
    for i, rt in enumerate(N.k_shortest_routes(inst, a, b, k=3)):
        eca = N.eca_distance(inst, rt)
        print(f"  {a}->{b} #{i+1}: {' '.join(rt):<45s} "
              f"{N.route_distance(inst, rt):7.0f} nm   ECA {eca:6.0f} nm")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("REPAIR DECODER  (feasible options per parcel)"); print(bar)
total = feasible = 0
rejects: dict[str, int] = {}
options = []
for p in inst.parcels.values():
    n_ok = 0
    for v in inst.compatible_vessels(p):
        for rt in N.k_shortest_routes(inst, p.origin_port, p.dest_port, k=3):
            for f in inst.compatible_fuels(v):
                total += 1
                r = repair(inst, p, v, rt, f)
                if r:
                    feasible += 1; n_ok += 1
                    options.append((p, v, rt, f, r))
                else:
                    key = r.reason.split("(")[0].strip()
                    rejects[key] = rejects.get(key, 0) + 1
    flag = "" if n_ok else "   <-- NO FEASIBLE OPTION"
    print(f"  {p.parcel_id} {p.origin_port}->{p.dest_port:<6s} {p.cargo_type:<16s} "
          f"{n_ok:3d} options{flag}")
print(f"\n  {feasible}/{total} raw candidates survived repair")
print("\n  top rejection reasons:")
for k, n in sorted(rejects.items(), key=lambda x: -x[1])[:6]:
    print(f"    {n:5d}  {k}")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("INNER SOLVE  (cheapest option per parcel, first 10)"); print(bar)
print(f"  {'parcel':6s} {'vessel':5s} {'fuel':6s} {'days':>6s} {'speeds (kn)':>26s} "
      f"{'fuel t':>8s} {'$fuel':>10s} {'tCO2e':>8s} {'$/day':>8s}")
best = {}
for (p, v, rt, f, r) in options:
    price = inst.bunker[(p.origin_port, f.fuel_id)].price_usd_per_t \
        if inst.bunker.get((p.origin_port, f.fuel_id), None) and \
           inst.bunker[(p.origin_port, f.fuel_id)].available else 700.0
    conds = N.build_conditions(inst, rt, r.depart_origin, v)
    try:
        sol = solve_voyage(v, conds, price, r.sailing_budget_days,
                           v.charter_rate_usd_per_day)
    except Exception:
        continue
    cost = (sol.fuel_cost_usd + sol.time_cost_usd
            + sum(inst.ports[c].port_dues_usd_per_gt * v.gross_tonnage +
                  inst.ports[c].pilotage_tug_usd for c in rt)
            + N.canal_toll(inst, rt, v)
            + ets_cost_usd(inst, f, sol.fuel_t, p.origin_port, p.dest_port))
    if p.parcel_id not in best or cost < best[p.parcel_id][0]:
        best[p.parcel_id] = (cost, v, f, sol, rt)

for pid in sorted(best)[:10]:
    cost, v, f, sol, rt = best[pid]
    sp = " ".join(f"{s:5.2f}" for s in sol.speeds_kn[:4])
    print(f"  {pid:6s} {v.vessel_id:5s} {f.fuel_id:6s} {sol.total_days:6.2f} "
          f"{sp:>26s} {sol.fuel_t:8.1f} {sol.fuel_cost_usd:10,.0f} "
          f"{co2e_wtw(f, sol.fuel_t):8.1f} {sol.lam_usd_per_day:8,.0f}")

# --------------------------------------------------------------------------- #
print("\n" + bar); print("TRADE-OFF CURVE  (C08 Singapore->Chennai, V08)"); print(bar)
p = inst.parcels["C08"]; v = inst.vessels["V08"]; f = inst.fuels["VLSFO"]
rt = N.k_shortest_routes(inst, p.origin_port, p.dest_port, k=1)[0]
r = repair(inst, p, v, rt, f)
conds = N.build_conditions(inst, rt, r.depart_origin, v)
price = inst.bunker[("SGSIN", "VLSFO")].price_usd_per_t
print(f"  route {' '.join(rt)}  {N.route_distance(inst, rt):.0f} nm | "
      f"budget {r.sailing_budget_days:.2f} d | load factor {r.load_factor:.2f}")
print(f"  {'budget d':>9s} {'speeds (kn)':>26s} {'fuel t':>8s} {'$fuel':>10s} "
      f"{'tCO2e WTW':>10s} {'$/day':>9s} {'binding':>8s}")
for T in [3.2, 3.6, 4.0, 4.6, 5.4, 6.5]:
    try:
        s = solve_voyage(v, conds, price, T, v.charter_rate_usd_per_day)
    except Exception as e:
        print(f"  {T:9.1f}  infeasible: {e}"); continue
    sp = " ".join(f"{x:5.2f}" for x in s.speeds_kn[:4])
    print(f"  {T:9.1f} {sp:>26s} {s.fuel_t:8.1f} {s.fuel_cost_usd:10,.0f} "
          f"{co2e_wtw(f, s.fuel_t):10.1f} {s.lam_usd_per_day:9,.0f} "
          f"{str(s.binding):>8s}")
print("\n  lam is the marginal value of one more day. When it stops falling the")
print("  deadline has gone slack and only the charter rate is pricing time.")
