# SIH26138 — Green Fleet Optimizer
## Implementation specification v1.0

Target: a quantum-inspired bilevel multi-objective optimizer for maritime fleet
deployment, routing, bunkering and speed profiling, producing a Pareto front over
cost, CO₂e and service level.

This document is the contract. Every module below has defined inputs, outputs and a
test. Build in the order given in §10 — each milestone is independently demoable.

---

## 1. Architecture

```
                         ┌──────────────────────────────────────┐
                         │  L3  OUTER — MOEA/D-AWA              │
                         │  100 weight vectors over 3 objectives│
                         │  quantum-behaved (QPSO) variation    │
                         │  adaptive weight adjustment          │
                         │  external Pareto archive             │
                         └───────┬──────────────────────▲───────┘
                    scalarised   │                      │  (f1,f2,f3)
                    cost coeffs  ▼                      │  per solution
                         ┌──────────────────────────────┴───────┐
                         │  L2  MASTER — discrete Simulated     │
                         │      Bifurcation (dSB) on GPU        │
                         │  QUBO over ~1,400 option binaries    │
                         │  assignment · route · fuel · bunker  │
                         └───────┬──────────────────────▲───────┘
                    fixed        │                      │  true voyage cost
                    discrete plan▼                      │  + Benders correction
                         ┌──────────────────────────────┴───────┐
                         │  L1  INNER — convex speed solve      │
                         │  exact, closed-form/Brent + bisection │
                         │  speed · load factor · bunker qty     │
                         │  · waiting time · trim                │
                         └───────┬──────────────────────▲───────┘
                                 │                      │
                         ┌───────▼──────────────────────┴───────┐
                         │  L0  REPAIR DECODER + FEASIBILITY    │
                         │  draft·tide·reserve·hours·ECA·compat │
                         │  every candidate legal by construction│
                         └──────────────────────────────────────┘
```

**The division of labour on constraints — read this twice.**

| Constraint class | Enforced where | Mechanism |
|---|---|---|
| Physical & operational (draft, tide, fuel reserve, port hours, compatibility, ECA fuel, one-way traffic, drydock) | **L0 repair decoder**, at cost-table build time | Infeasible options never enter the QUBO at all |
| Structural (exactly one option per mandatory parcel; a vessel cannot be in two places at once) | **L2 QUBO**, as penalty terms | dSB has no other mechanism — these are unavoidable |
| Regulatory soft caps (carbon budget, FuelEU, CII band) | **L3 outer**, as an ε-constraint | Lets the Pareto front show the cost of compliance |

Earlier framing said "repair, not penalties." Precisely: penalties are used *only* for
the two structural constraints that are intrinsic to a QUBO. Everything physical is
repaired. Do not let penalty weights creep into draft or tide handling.

---

## 2. Repository layout

```
fleetopt/
├── data/                        # the 13 CSVs + DATA_DICTIONARY.md
├── fleetopt/
│   ├── io/
│   │   ├── loader.py            # CSV → typed dataclasses, validated
│   │   └── schema.py            # dataclass definitions
│   ├── model/
│   │   ├── vessel.py            # fuel curve, draft(load), capacity
│   │   ├── network.py           # legs, distances, ECA, speed caps
│   │   ├── ports.py             # tide lookup, congestion sampler, dwell
│   │   └── emissions.py         # TTW/WTW, ETS scope, CII, FuelEU
│   ├── inner/
│   │   ├── speed_solve.py       # THE convex solver — build this first
│   │   ├── voyage.py            # multi-leg voyage assembly
│   │   └── bunker_plan.py       # where and how much to refuel
│   ├── repair/
│   │   └── decoder.py           # genotype → legal schedule
│   ├── master/
│   │   ├── option_gen.py        # enumerate legal (parcel,vessel,route,fuel,bunker)
│   │   ├── cost_table.py        # price every option via inner solve
│   │   ├── qubo.py              # build Q matrix
│   │   └── dsb.py               # discrete Simulated Bifurcation wrapper
│   ├── outer/
│   │   ├── moead_awa.py         # decomposition + adaptive weights
│   │   ├── qpso.py              # quantum-behaved sampling operator
│   │   └── archive.py           # non-dominated archive
│   ├── objectives.py            # f1 cost, f2 CO2e, f3 service
│   └── benchmark/
│       ├── baselines.py         # NSGA-III, MOEA/D-DE, SA, MILP oracle
│       ├── indicators.py        # HV, IGD+, spacing, anytime curves
│       └── runner.py            # 31 seeds, Wilcoxon + Holm
├── tests/
└── scripts/run_experiment.py
```

**Dependencies**

```
numpy scipy pandas pymoo torch simulated-bifurcation pyqubo highspy pytest
```

`simulated-bifurcation` (bqth29, PyTorch/GPU) is the dSB engine. `pymoo` supplies
MOEA/D-AWA scaffolding and the HV/IGD+ indicators. `highspy` is the MILP oracle used
only to certify small instances — never in the production path.

---

## 3. Data contracts

Every module declares exactly which CSVs it may read. Violating this is how the
architecture rots.

| Module | Reads |
|---|---|
| `model/vessel.py` | `vessels.csv`, `vessel_fuel_compatibility.csv`, `vessel_cargo_compatibility.csv` |
| `model/network.py` | `legs.csv`, `ports.csv` |
| `model/ports.py` | `ports.csv`, `tide_windows.csv`, `port_congestion.csv`, `port_cargo_handling.csv` |
| `model/emissions.py` | `fuels.csv`, `scenario_parameters.csv` |
| `inner/speed_solve.py` | vessel fuel curve + `weather_forecast.csv` + `legs.csv` + price scalar |
| `inner/bunker_plan.py` | `bunker_availability_price.csv`, vessel tank capacity |
| `repair/decoder.py` | `tide_windows.csv`, `ports.csv`, `port_cargo_handling.csv`, `port_congestion.csv` |
| `master/option_gen.py` | `cargo_parcels.csv` + all compatibility + network |
| `objectives.py` | `fuels.csv`, `scenario_parameters.csv`, `vessels.csv` (charter), `ports.csv` (dues), `cargo_parcels.csv` (revenue, penalties) |

**Loader contract.** `loader.load_instance(path, scenario="BASE") -> Instance`.
It must fail loudly on: unknown port codes, a parcel with zero feasible vessels, a
vessel whose `ballast_draft_m` exceeds its `start_port` depth, negative distances.
Do not silently drop rows.

---

## 4. L1 — The inner convex speed solve

**This is the core of the whole project. Build it first, test it hardest.**

### 4.1 Problem

A vessel `v` sails legs `i = 1..n` with sub-leg distances `d_i` (nm), added-resistance
multipliers `m_i` (from `weather_forecast.resistance_multiplier`), signed currents
`c_i` (kn, positive = favourable), at fuel price `p` (USD/t). Fixed port stays consume
`T_port`. The voyage must complete within `T_avail` days.

Choose sailing times `t_i` (days).

```
through-water speed   u_i(t_i) = d_i / (24 · t_i)  −  c_i
main-engine burn      B_i(t_i) = a · u_i^b · m_i · t_i          [t/day × day]
auxiliary burn                  = aux_sea · t_i
total leg fuel        F_i(t_i) = a · m_i · t_i · u_i(t_i)^b + aux_sea · t_i

minimise    Σ_i  p · F_i(t_i)
subject to  Σ_i  t_i  ≤  T_avail − T_port
            d_i/(24·(v_max + c_i))  ≤  t_i  ≤  d_i/(24·(v_min + c_i))
            leg speed cap from legs.max_speed_kn overrides v_max
```

`a = vessels.fuel_a`, `b = vessels.fuel_b`, `aux_sea = vessels.aux_sea_t_per_day`.

### 4.2 Why it is convex, and how to verify

For `b ≥ 1` and `u_i > 0`, `F_i` is convex in `t_i` on the operating interval. With
`c_i = 0, b = 3` it reduces to `F = A/t² + aux·t` with `A = a·m·d³/24³` — manifestly
convex. With current it remains convex wherever ground speed exceeds the current,
which always holds physically.

**Do not take this on faith in code.** `speed_solve.py` must expose
`_verify_convexity(leg, n=200)` which evaluates `F_i` on a grid and asserts the second
difference is non-negative throughout. Run it in the test suite for every vessel ×
every sea area. If it ever fails, fall back to Brent's method on that leg (still
globally optimal for a unimodal function) and log a warning.

### 4.3 Algorithm — bisection on the shadow price of time

The Lagrangian is **separable**:

```
L(t, λ) = Σ_i [ p · F_i(t_i) + λ · t_i ]
```

For a fixed `λ` each leg minimises independently. `λ` has units **USD/day** and is
the marginal value of one more day of voyage time — quote this in your pitch, it is
the economically meaningful output.

```python
def solve_voyage(legs, vessel, price, T_avail, tol=1e-6):
    lo, hi = 0.0, 1e7
    for _ in range(80):
        lam = 0.5 * (lo + hi)
        t = [solve_leg(L, vessel, price, lam) for L in legs]
        if sum(t) > T_avail: lo = lam      # too slow → time must cost more
        else:                hi = lam
    return [solve_leg(L, vessel, price, hi) for L in legs], hi
```

`Σ t_i(λ)` is monotonically non-increasing in `λ`, so bisection is exact.
80 iterations gives ~1e-24 relative precision — overkill, but it costs nothing.

**Per-leg minimisation.** With `c_i = 0` and `b = 3` there is a closed form from
`dF/dt = −λ/p`:

```
t_i* = ( 2A_i / (aux_sea + λ/p) )^(1/3),   A_i = a · m_i · d_i³ / 24³
```

then clip to `[t_min, t_max]`. With `c_i ≠ 0` or `b ≠ 3`, solve the same first-order
condition with `scipy.optimize.brentq` on `t`. Never grid-search in production — the
demo script does, and it is 400× slower.

**Early exit.** If `Σ t_i(λ=0) ≤ T_avail`, time is free: return the unconstrained
minimum and `λ = 0`. This happens on slack schedules and skips the bisection entirely.

### 4.4 Extensions inside the same solve

- **Load factor** — enters through draft (`draft = ballast + (design − ballast)·LF`)
  and marginally through `a`. Treat as an outer 1-D golden-section search over LF for
  each voyage, with the speed solve nested inside. Bounded by
  `min_load_factor`, `max_load_factor`, and port depth at every call.
- **Waiting time (just-in-time arrival)** — add a variable `w ≥ 0` at the destination
  and replace the budget with `Σ t_i + w = T_avail`. Because waiting at anchor burns
  `aux_anchor` and sailing slower burns less than that, the solver will naturally
  prefer slow steaming to anchoring. That result *is* the JIT-arrival finding.
- **Bunker quantity** — see §5.

### 4.5 Tests

```
test_closed_form_matches_brent      max rel. error < 1e-9 across 500 random legs
test_monotone_in_budget             more time ⇒ strictly less fuel
test_lambda_is_marginal_cost        dF/dT ≈ −λ/p by finite difference, < 0.1% error
test_bounds_respected               all speeds within [v_min, min(v_max, leg cap)]
test_equal_marginal_condition       ∂F_i/∂t_i equal across unclipped legs (KKT)
test_convexity_all_vessels          _verify_convexity passes for 11 vessels × 10 areas
```

`test_lambda_is_marginal_cost` and `test_equal_marginal_condition` are the ones that
actually prove correctness. Do not skip them.

---

## 5. L1b — Bunker planning

Given a fixed port sequence, decide **where** to bunker (discrete → belongs to the
master) and **how much** (continuous → belongs here).

Once bunker ports are fixed, quantity is a linear program:

```
minimise  Σ_j  price_j · q_j
s.t.      fuel_level after each leg ≥ min_fuel_reserve_t
          fuel_level ≤ fuel_tank_capacity_t          (everywhere)
          q_j ≥ min_lot_t  or  q_j = 0               (semi-continuous)
          bunkering time = q_j / bunkering_rate_t_per_h  added to port stay
```

Solve with `scipy.optimize.linprog` (HiGHS). The semi-continuous minimum-lot rule
makes it technically a MILP; with ≤ 5 bunker stops per voyage, enumerate the 2⁵
on/off patterns and solve each LP. Milliseconds.

**Methanol trap** — `MEOH` has `lcv_mj_per_kg = 19.9` against VLSFO's 40.2. Convert
energy demand to tonnage via LCV ratio, or V10 will appear to have twice the range it
has. Add an explicit test: `test_methanol_tonnage_doubles`.

---

## 6. L0 — Repair decoder

`decoder.repair(raw_plan) -> LegalSchedule | INFEASIBLE`

Applied in order. Each rule either fixes the plan or rejects it.

| # | Rule | Fix | Data |
|---|---|---|---|
| 1 | Vessel–cargo compatible? | reject | `vessel_cargo_compatibility` |
| 2 | Vessel–fuel compatible? | reject | `vessel_fuel_compatibility` |
| 3 | `ballast_draft` ≤ port `max_draft_m` at every call? | reject | `ports` |
| 4 | `draft(LF)` ≤ port `max_draft_m`? | **reduce LF** to the max that fits; reject if below `min_load_factor` | `ports`, `vessels` |
| 5 | Tidal port? | snap ETA to the next window in `tide_windows` where `max_sailing_draft_m ≥ draft(LF)`; add the wait | `tide_windows` |
| 6 | Port operating hours | if arrival falls outside, delay to next opening | `ports.operating_hours_per_day` |
| 7 | Congestion | sample `exp(mu + sigma·Z)` from `port_congestion`, add as queueing time | `port_congestion` |
| 8 | Cargo handling | `quantity / handling_rate_per_h + fixed_berthing_h + fixed_departure_h` | `port_cargo_handling` |
| 9 | ECA | on legs with `eca_fraction > 0`, force an ECA-compliant fuel for that share; if the vessel can't switch at sea, force it for the whole leg | `legs`, `fuels`, `vessels` |
| 10 | One-way traffic / speed cap | clamp `v_max` to `legs.max_speed_kn`; add convoy wait for Suez | `legs` |
| 11 | Fuel reserve | insert a bunker stop at the cheapest reachable port with the fuel available; reject if none | `bunker_availability_price` |
| 12 | Drydock | reject if any voyage day overlaps `drydock_from..drydock_to` | `vessels` |
| 13 | Laycan | reject if arrival at origin is after `laycan_end` | `cargo_parcels` |

Rules 5, 7 and 11 *change the time budget*, so the inner speed solve must run **after**
the decoder, never before. Getting this order wrong is the single most likely bug.

Lateness against `delivery_deadline` is **not** repaired — it is priced into `f3` and
`late_penalty_usd_per_day`. Let the Pareto front expose it.

---

## 7. L2 — Master: option generation, cost table, QUBO, dSB

### 7.1 Option generation

An **option** is a bundle: `(parcel, vessel, route, fuel, bunker_port)`.

```python
def generate_options(instance) -> list[Option]:
    for parcel in instance.parcels:
        for vessel in compatible_vessels(parcel):
            for route in k_shortest_routes(parcel.origin, parcel.dest, k=3):
                for fuel in compatible_fuels(vessel):
                    for bunker in feasible_bunker_ports(route, vessel, fuel) + [None]:
                        opt = Option(parcel, vessel, route, fuel, bunker)
                        if decoder.repair(opt) is not INFEASIBLE:
                            yield opt
```

Use Yen's k-shortest-paths on the `legs` graph with `distance_nm` as weight, k=3.
Expect ~1,200–1,600 surviving options for this instance (the validator measured
~1,386). Anything above ~5,000 means your feasibility filter is too loose.

### 7.2 Cost table

```python
C[opt] = (fuel_cost + charter_cost + port_dues + pilotage + canal_toll
          + ets_cost + shore_power_cost − freight_revenue)
```

Each entry comes from a full `repair → inner solve` pass. ~1,400 entries × ~2 ms
= about 3 seconds, once, before the search starts. Cache it to disk keyed by scenario.

Also store `E[opt]` (tonnes CO₂e WTW) and `S[opt]` (late-days) — the outer level needs
all three to scalarise.

### 7.3 QUBO

Binary `x_k ∈ {0,1}` for each option `k`. Let `P(k)` be its parcel, `V(k)` its vessel,
`[s_k, e_k]` its occupied time interval.

```
H(x) = Σ_k  Ĉ_k · x_k                                            (linear, scalarised)
     + A · Σ_{p ∈ mandatory} ( Σ_{k: P(k)=p} x_k − 1 )²          (exactly one)
     + A · Σ_{p ∈ optional}  Σ_{k<k': P=p} x_k x_k'              (at most one)
     + A · Σ_{k,k': V(k)=V(k'), overlap(k,k')} x_k x_k'          (no double-booking)
```

- `Ĉ_k` is the **Tchebycheff-scalarised** cost handed down from L3, not the raw USD.
- `A = 1.5 · max_k |Ĉ_k|`. Recompute `A` each time the scalarisation changes —
  a stale penalty weight is the classic silent failure.
- Expand the squares into linear + quadratic terms; the linear part goes on the
  diagonal of `Q`.
- Do **not** add penalties for draft, tide, reserve or ECA. Those options were already
  filtered out in §7.1. If you find yourself writing such a penalty, the bug is in
  `option_gen`.

Build with `pyqubo` or assemble the dense `Q` directly with numpy — at 1,400 binaries
the dense matrix is 1400² × 8 B ≈ 16 MB, entirely fine on GPU.

### 7.4 dSB

```python
import simulated_bifurcation as sb
spins = sb.minimize(Q, domain="binary", agents=128, max_steps=10000,
                    mode="discrete", use_window=True, device="cuda")
```

- `agents` = parallel replicas. 128 is a good default; more agents beats more steps.
- `mode="discrete"` → dSB. Also benchmark `"ballistic"` (bSB) and report both.
- If dSB tuning fights you, the documented fallback is Tabu-Enhanced SB (TESB),
  which adds a history-guided dynamic penalty.
- **CPU fallback is mandatory** — judges may not have a GPU. `device="cpu"` works;
  budget ~20× the runtime.

### 7.5 Benders-style correction loop

The cost table prices each option in isolation. It misses two couplings: a vessel
serving consecutive parcels shares one time budget, and it must reposition (ballast
leg) between them.

```
repeat up to 20 times:
    x   ← dSB(Q)
    for each vessel with ≥2 assigned parcels:
        true ← exact multi-parcel voyage solve (repair + inner, whole sequence)
        Δ    ← true − Σ table costs for those options
        distribute Δ onto Q[k,k'] for each assigned pair on that vessel
    if max|Δ| < ε or x unchanged: break
```

The table estimate is always optimistic (it ignores repositioning), so `Δ ≥ 0` and
corrections only tighten. That guarantees convergence.

**Report the exact cost, never the table cost.** Every solution entering the Pareto
archive is re-priced by a full inner solve on the complete plan. Table error then
affects search efficiency only, never the correctness of your published numbers.

---

## 8. L3 — Outer: MOEA/D-AWA + QPSO

### 8.1 Objectives

```
f1  total cost (USD)      = Σ (fuel + charter + port + canal + ETS + shore power)
                            − Σ freight revenue + Σ late penalties
f2  emissions (t CO₂e)    = Σ_legs  fuel_t · co2_ttw   (TTW)
                            report WTW via co2e_wtw_g_per_mj × energy for FuelEU
f3  service violation     = Σ_parcels max(0, arrival − delivery_deadline) in days,
                            weighted by freight_revenue
```

All three minimised. Keep `f1` and `f3` separate even though late penalties appear in
`f1` — the double count is deliberate and makes the trade-off visible.

### 8.2 Decomposition

Tchebycheff with `N = 100` weight vectors from Das–Dennis on the 3-simplex:

```
g_te(x | λ^j, z*) = max_{m=1..3}  λ^j_m · | f_m(x) − z*_m | / (z^nad_m − z*_m)
```

Normalise by the ideal/nadir range — `f1` is ~10⁶ USD and `f3` is ~10 days, so
unnormalised Tchebycheff would let cost swamp everything.

**Phase A (seeding).** For each `λ^j`, scalarise the cost table, build the QUBO,
run dSB. 100 dSB solves ≈ 100 × 0.4 s on GPU ≈ 40 s. This alone gives a usable
Pareto front and is a complete demo by itself.

**Phase B (refinement).** Standard MOEA/D generational loop. For subproblem `j`:
- sample a neighbour pair from `B(j)` (T = 20 nearest weight vectors)
- apply the QPSO operator (§8.3) to the **continuous** block — load factors, waiting
  times, and the per-voyage time budgets `T_avail`
- re-run dSB for the discrete block **only** if the subproblem has stagnated for
  ≥ 5 generations or AWA moved its weight vector; otherwise reuse the incumbent
  assignment and just re-solve the inner level. This keeps dSB calls to ~10% of
  evaluations, which is what makes the runtime tractable.
- update `z*`, neighbours, and the external archive

### 8.3 QPSO operator (the quantum-inspired variation)

Real-coded, no rotation-gate lookup table:

```
mbest    = mean of personal bests across the swarm
p_i      = φ · pbest_i + (1 − φ) · gbest,        φ ~ U(0,1)
x_i(t+1) = p_i ± β · |mbest − x_i(t)| · ln(1/u), u ~ U(0,1), sign by coin flip
β        = 1.0 → 0.5 linearly over the run
```

Applied to the continuous decision block only. The width term
`β·|mbest − x_i|` contracts automatically as the population converges — wide
exploration early, fine tuning late, and **zero hand-tuned parameters beyond β**.
That absence is the point; say so in your writeup.

### 8.4 AWA — adaptive weight adjustment

Every `G = 20` generations:
1. Compute the crowding distance of every archive member in normalised objective space.
2. Delete the `nus = 0.05·N` most crowded subproblems.
3. Add `nus` new weight vectors positioned at the sparsest archive regions.
4. Rebuild neighbourhoods `B(j)`.

This is what handles the discontinuities your front will have at fuel-type switches
and CII band edges. Without it, ~20% of subproblems pile onto the cliff edge.

### 8.5 ε-constraint for regulatory caps

`carbon_budget_tco2` from `scenario_parameters` enters as an ε-constraint on `f2`,
not a penalty. Sweep it across runs to produce the compliance-cost curve — that chart
is worth more to judges than any single Pareto point.

---

## 9. Benchmarking

### 9.1 Baselines

| Baseline | Library | Purpose |
|---|---|---|
| NSGA-III | pymoo | standard many-objective reference |
| MOEA/D-DE | pymoo | shows AWA's contribution in isolation |
| SMS-EMOA | pymoo | hypervolume-driven reference |
| Simulated annealing on the same QUBO | own | isolates dSB's contribution |
| bSB (ballistic) | simulated-bifurcation | dSB vs bSB comparison |
| HiGHS MILP with 5-bin piecewise speed | highspy | **the competitor formulation** |
| HiGHS MILP exact, ≤ 6 parcels | highspy | optimality oracle |

The MILP-with-5-bins baseline is the one that matters. It replicates what the
published QUBO/annealing papers do. Beating it on both solution quality and runtime
*is* your contribution claim.

### 9.2 Indicators

Hypervolume (reference point = nadir × 1.1), IGD+ against the union of all runs'
non-dominated points, spacing, feasible-solution rate, and — most important —
**anytime HV**: hypervolume as a function of wall-clock seconds, logged every 0.5 s.

Final-generation numbers are no longer sufficient. A GPU simulated-bifurcation machine
was recently shown to close a reported quantum–classical scaling gap, demonstrating
that earlier instances were too small to establish advantage under careful runtime
accounting. Report anytime curves or expect the question.

### 9.3 Protocol

31 seeds per configuration. Wilcoxon rank-sum with Holm–Bonferroni correction across
the baseline family. Report median and IQR, not mean ± sd — HV distributions are
skewed. Fix the wall-clock budget identically across all methods, including data
loading.

### 9.4 The headline number

Alongside the indicators, report **% fuel and % CO₂e saved versus a business-as-usual
schedule** — every vessel at `design_speed_kn`, cheapest compatible fuel, greedy
nearest-parcel assignment. Implement BAU in `baselines.py` as `bau_schedule()`.
This is the number a judge remembers.

---

## 10. Build order

| M | Deliverable | Done when |
|---|---|---|
| **M0** | `io/loader.py` + `schema.py` | all 13 CSVs load into typed objects; validator passes |
| **M1** | `inner/speed_solve.py` | all six tests in §4.5 pass; single-voyage trade-off curve reproduces the demo table |
| **M2** | `repair/decoder.py` | all 13 rules implemented; fuzz 10,000 random plans, zero illegal outputs |
| **M3** | `master/option_gen.py` + `cost_table.py` | ~1,400 options priced in < 10 s; cached |
| **M4** | `master/qubo.py` + `dsb.py` | single-weight solve beats BAU on cost; CPU fallback works |
| **M5** | `outer/moead_awa.py` Phase A | 100-point Pareto front in < 2 min |
| **M6** | Phase B + QPSO + AWA + `benchmark/` | full statistical comparison vs all baselines |

**M1 alone is demoable** and produces a real fuel-saving figure. **M4 is a complete
single-objective optimizer.** **M5 is the full pitch.** M6 is what wins on rigour.
If time runs out, stop at M5 and spend the remainder on the BAU comparison and charts.

---

## 11. Pitfalls, ranked by how likely they are to bite

1. **Running the inner solve before the repair decoder.** Tide and congestion waits
   change `T_avail`. Order: repair → budget → speed solve. Always.
2. **Stale penalty weight `A`.** It depends on the scalarised costs, which change
   every weight vector. Recompute it, do not cache it.
3. **Unnormalised Tchebycheff.** `f1` ~10⁶, `f3` ~10¹. Normalise by ideal/nadir or
   the front collapses onto the cost axis.
4. **Methanol tonnage.** Half the LCV means double the mass. Test it explicitly.
5. **Forgetting `aux_sea_t_per_day`.** Without auxiliary load the optimizer drives
   every speed to `v_min`. If your speeds all pin to the lower bound, this is why.
6. **Reporting table costs instead of exact costs.** Every archived solution gets a
   full re-solve. No exceptions.
7. **Draft treated as constant.** It is `ballast + (design − ballast)·LF`. Treating
   it as fixed removes the entire load-factor/port-access trade-off — the most
   interesting coupling in the dataset.
8. **Assuming convexity without checking.** `_verify_convexity` in CI.

---

## 12. Paste-ready prompt for a coding agent

> You are implementing a quantum-inspired bilevel multi-objective optimizer for
> maritime green fleet management (SIH26138). The full specification is in
> `IMPLEMENTATION_SPEC.md` and the dataset is described in `DATA_DICTIONARY.md`;
> read both completely before writing any code.
>
> Architecture: three levels. **L1 inner** solves speed/load-factor/bunker-quantity
> exactly as a convex program via bisection on a Lagrange multiplier — never by
> search or discretisation. **L2 master** solves the discrete assignment, routing,
> fuel and bunker-port choice as a QUBO via discrete Simulated Bifurcation. **L3
> outer** runs MOEA/D with adaptive weight adjustment and a quantum-behaved (QPSO)
> variation operator to produce a Pareto front over cost, CO₂e and service level.
> **L0** is a repair decoder that makes every candidate legal by construction;
> physical constraints are repaired, never penalised.
>
> Build strictly in the milestone order of §10. Do not start M(n+1) until every test
> for M(n) passes. Begin with `io/loader.py` and `inner/speed_solve.py`.
>
> Non-negotiable rules:
> - Speed is continuous and solved to global optimality. Never bin it.
> - Run the repair decoder before the inner solve — it changes the time budget.
> - Draft is a function of load factor: `ballast + (design − ballast) × LF`.
> - Recompute the QUBO penalty weight `A` whenever the scalarisation changes.
> - Normalise objectives before Tchebycheff scalarisation.
> - Re-price every archived solution with an exact inner solve; never report
>   cost-table estimates.
> - Include `aux_sea_t_per_day` in every fuel calculation.
> - Provide a CPU fallback for dSB.
>
> Write pytest tests alongside each module, especially the six in §4.5. Assert the
> KKT condition (equal marginal fuel savings per unit time across unclipped legs) —
> that test is what proves the inner solve is correct.
