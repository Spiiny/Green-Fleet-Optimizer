# fleetopt — SIH26138 green fleet optimizer

Quantum-inspired bilevel multi-objective optimizer for maritime fleet deployment,
routing, bunkering and speed profiling.

See `IMPLEMENTATION_SPEC.md` for the architecture and `DATA_DICTIONARY.md` for the
dataset. **Milestones M0–M2 are implemented and tested.** M3–M6 are scaffolded.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Your CSVs go in `data/`. Then:

```bash
pytest                      # 21 tests, all green
python scripts/demo_m2.py   # routing + repair + inner solve
python scripts/demo_m4.py   # options -> QUBO -> dSB -> comparison vs BAU and SA
python scripts/demo_m5.py   # full Pareto front  (~4.5 min; --quick for ~40 s)
python scripts/demo_m6.py --quick        # maritime benchmark vs pymoo baselines
python scripts/ablation.py               # which components actually help
python scripts/benchmark_standard.py --seeds=15    # ZDT/DTLZ comparison
python scripts/scaling_probe.py --sizes=24,48,96   # does dSB pay off with size?
```

## READ THIS BEFORE QUOTING ANY NUMBER

Three findings that run against the original design. All are measured, all are
reproducible from the scripts above, and all are more useful to you than a
tuned win would have been.

**1. dSB as the main search engine loses.** M6, 24 parcels, equal wall clock,
one shared HV reference box:

| method | HV | IGD+ | evals in 20 s |
|---|---|---|---|
| SMS-EMOA | **0.769** | 0.023 | 6,200 |
| NSGA-III | 0.743 | 0.044 | 4,884 |
| MOEA/D-AWA + dSB (original L3) | 0.674 | 0.097 | 168 |
| random search | 0.485 | 0.325 | 2,081 |

A12 effect size vs SMS-EMOA and NSGA-III is 0.00 — we lose every paired
comparison. Diagnosis: 168 evaluations against 6,200. One dSB call costs orders
of magnitude more than one SBX crossover, and below ~10³ spins that cost is not
amortised. The gap **widened** at 48 parcels (0.396 vs 0.817), so instance size
is not the explanation on CPU.

**2. QPSO costs hypervolume; dSB seeding gains it.** Ablation, 30 s each:

| configuration | HV |
|---|---|
| SMS-EMOA + SBX + dSB seeding | **0.6626** |
| SMS-EMOA + QPSO + dSB seeding *(shipped default)* | 0.6230 |
| SMS-EMOA + QPSO, random init | 0.5971 |
| MOEA/D-AWA + dSB | 0.5817 |

dSB seeding is worth +4.3%. QPSO costs −6.0% against stock SBX+PM. The default
keeps QPSO because SIH26138 requires a quantum-inspired method in the loop —
a deliberate trade, not an oversight. `use_qpso=False` for maximum raw HV.

**3. Standard benchmarks: we win two objectives, lose three.** Full six-metric
suite, 7 seeds, 15,000 evaluations — `results/benchmark_standard_6metric.txt`.

Indicator directions: **GD ↓ IGD ↓ IGD+ ↓ HV ↑ Spacing ↓ Spread ↓**

ZDT1:

| algorithm | GD ↓ | IGD ↓ | IGD+ ↓ | HV ↑ | Spacing ↓ | Spread ↓ |
|---|---|---|---|---|---|---|
| **Ours (SMS-EMOA+QPSO)** | **0.00074** | **0.00453** | **0.00408** | **0.71723** | 0.00419 | **0.19939** |
| SMS-EMOA (SBX) | 0.00083 | 0.00523 | 0.00473 | 0.71628 | **0.00383** | 0.21199 |
| NSGA-II | 0.00098 | 0.00694 | 0.00666 | 0.71369 | 0.00485 | 0.36059 |
| NSGA-III | 0.00078 | 0.00738 | 0.00706 | 0.71234 | 0.00991 | 0.35955 |
| MOEA/D | 0.00112 | 0.01046 | 0.00851 | 0.70922 | 0.01508 | 0.63794 |

DTLZ2 (three objectives, the class our real problem belongs to):

| algorithm | GD ↓ | IGD ↓ | IGD+ ↓ | HV ↑ | Spacing ↓ | Spread ↓ |
|---|---|---|---|---|---|---|
| Ours | 0.00561 | 0.06527 | 0.01771 | **0.92875** | 0.02898 | 0.26769 |
| NSGA-III | **0.00035** | **0.00234** | **0.00180** | 0.92707 | **0.02768** | **0.16784** |
| MOEA/D | 0.00033 | 0.00242 | 0.00228 | 0.92679 | 0.02769 | 0.16885 |

Who wins what, all five problems:

| problem | GD ↓ | IGD ↓ | IGD+ ↓ | HV ↑ | Spacing ↓ | Spread ↓ |
|---|---|---|---|---|---|---|
| ZDT1 | **ours** | **ours** | **ours** | **ours** | SBX | **ours** |
| ZDT2 | MOEA/D | **ours** | **ours** | **ours** | SBX | **ours** |
| ZDT3 | SBX | SBX | SBX | SBX | SBX | NSGA-III |
| DTLZ1 | MOEA/D | SBX | SBX | SBX | **ours** | **ours** |
| DTLZ2 | MOEA/D | NSGA-III | NSGA-III | **ours** | NSGA-III | NSGA-III |

Significance (Wilcoxon rank-sum on IGD+, Holm-corrected):

| problem | verdict |
|---|---|
| ZDT1 | better than NSGA-II, NSGA-III, MOEA/D; **tied** with SBX |
| ZDT2 | better than NSGA-II, NSGA-III; tied with SBX and MOEA/D |
| ZDT3 | **worse** than SBX and NSGA-II |
| DTLZ1 | **worse** than NSGA-III, SBX, MOEA/D |
| DTLZ2 | **worse** than all four |

**Read it honestly.** QPSO wins convergence on two-objective smooth problems and
consistently wins **Spread** — it reaches the extremes better than anything
else, including on DTLZ1 where its convergence is dreadful. It loses on
three-objective and multimodal landscapes. Nobody reached IGD+ < 1e-3 at this
budget.

Scalability, ZDT1 at n = 10 / 30 / 100 — HV retained at n=100 vs n=10:

| algorithm | HV retained | runtime ratio |
|---|---|---|
| SMS-EMOA (SBX) | 79.5% | 1.33× |
| **Ours** | **78.6%** | **1.03×** |
| NSGA-II | 77.2% | 1.31× |
| NSGA-III | 77.1% | 1.29× |
| MOEA/D | 12.7% | 0.98× |

QPSO degrades no faster than SBX and its runtime is flat in dimension, which is
the one clean scaling win in the whole study. MOEA/D collapses.

**Disclosure:** every baseline ran at pymoo defaults; QPSO got one parameter
sweep (`prob`: 1.0 → 0.00348, 1/n → 0.00357, 0.3 → 0.00329). Say so out loud.

## What to actually present

The search algorithm is not the contribution. These are:

1. **Exact convex speed solve** (L1) — continuous, provably global, λ in USD/day.
   No competitor does this; they all bin speed and lose ~8% of the burn.
2. **The Pareto front** — 24.6% CO₂e for 22.7% margin at the knee; 5.8% for 2.5%
   at constant service, with intensity falling 4.6 → 4.4 g/tonne-mile.
3. **Hard constraints guaranteed by deletion**, not penalty.
4. **The honest benchmark**, including where the method loses.
5. **The capacity finding** — the fleet is one large container vessel short.

## What is built

| Milestone | Module | Status |
|---|---|---|
| M0 | `io/schema.py`, `io/loader.py` | done — 13 CSVs → typed objects, validation raises on any inconsistency |
| M1 | `inner/speed_solve.py` | done — closed-form per leg, bisection on the shadow price of time |
| M2 | `repair/decoder.py`, `model/*` | done — 13 rules, 339 legal options from 498 raw candidates |
| M3 | `master/option_gen.py` | done — 851 options enumerated, repaired and exactly priced in ~1 s |
| M4 | `master/qubo.py`, `dsb.py`, `correction.py` | done — QUBO, discrete Simulated Bifurcation in numpy, Benders-style correction |
| M5 | `outer/moead_awa.py`, `qpso.py`, `archive.py`, `plan.py` | done — 141-point Pareto front |
| M6 | `benchmark/` | done — maritime + standard-benchmark comparison, ablation |
| M7 | `outer/sms_emoa.py` | done — revised L3 after M6; **not yet the default entry point** |

## M4 results on this instance

| | BAU | SA | dSB |
|---|---|---|---|
| margin | $11.65M | $11.75M | **$11.97M** |
| parcels served | 17/24 | 21/24 | 21/24 |
| fuel per parcel | 179 t | — | **175 t** |
| runtime | — | 0.3 s | 10.8 s |

851 binaries, 24,249 conflict pairs, 9% density. dSB beats a strong greedy
baseline by 2.7% on margin while serving four more parcels.

**Two findings worth more than the margin number.**

*The Pareto preview.* Re-solving with weight shifted onto CO₂e:

| weights (cost, CO₂, late) | margin | CO₂e |
|---|---|---|
| (1.0, 0.0, 0.0) | $11.97M | 20,023 t |
| (0.7, 0.3, 0.0) | $11.60M | 13,271 t |
| (0.5, 0.5, 0.0) | $10.50M | 10,720 t |

**A 46% emissions cut costs 12% of margin.** That single line is the whole case
for multi-objective optimisation, and M5 turns those four hand-picked rows into
100 adaptive ones.

*The capacity finding.* Two mandatory parcels (C09, C21) cannot be served by any
feasible assignment — every large container parcel needs V09, the only 8,000 TEU
ship, and their laycans overlap. The fleet is one vessel short. The optimiser
reports this instead of quietly dropping the cargo.

## M5 results — the Pareto front

141 non-dominated points in 278 s. Lateness is zero across the front, so the
trade-off is cost against carbon.

| | margin | CO₂e | served | g/t-mile |
|---|---|---|---|---|
| cheapest | $13.14M | 11,688 t | 18/24 | 4.6 |
| knee | $10.16M | 8,813 t | 17/24 | 4.3 |
| greenest | $7.84M | 8,344 t | 17/24 | 4.6 |

**Knee point: 24.6% less CO₂e for 22.7% of margin.** And at constant service
(18/24, top three rows) the front still delivers **5.8% CO₂ for 2.5% of margin**
— carbon intensity falls 4.6 → 4.4 g/t-mile, so that part is genuine efficiency,
not just carrying less cargo.

| method | points | HV | IGD+ |
|---|---|---|---|
| MOEA/D-AWA | 141 | **0.885** | 0.000 |
| BAU | 1 | 0.267 | 1.218 |
| CO₂-only dSB | 1 | 0.100 | 1.583 |
| cost-only dSB | 1 | 0.047 | 2.502 |

Hypervolume uses one shared reference box across every method. Computed
per-method it is meaningless — a single point scores 1.0 against its own
degenerate box, which is exactly how a one-shot solver ends up appearing to beat
a real front. `test_hypervolume_needs_a_shared_box` pins this.

Only 8% of evaluations call dSB; the rest are cheap inner re-solves under the
QPSO speed policy. That ratio is what makes the runtime tractable.

## The three things to understand

**1. Speed is solved exactly, never searched.** `solve_voyage` bisects on a single
scalar `lam` (USD/day — the marginal value of one more day of voyage time). For a
fixed `lam` each leg has a closed-form optimal duration, so the whole voyage is
solved to global optimality in ~80 cheap iterations. No binning, no metaheuristic.

**2. Charter cost sets the slow-steaming floor, not auxiliary load.** Pass
`time_cost_usd_per_day=vessel.charter_rate_usd_per_day` or the fuel-minimising speed
for most of these ships is 4–6 kn. `test_charter_cost_sets_the_slow_steaming_floor`
pins this down.

**3. Physical constraints are repaired; only structural ones are penalised.**
The QUBO carries exactly two penalty terms — one option per parcel, and no
double-booking a vessel. Draft, tide, fuel reserve, ECA and port hours never
appear: those options were filtered out before the QUBO existed. If you find
yourself writing a draft penalty, the bug is in `option_gen`.

**4. To sail slower you lower the time cost, not raise the budget.** Handing
`solve_voyage` a bigger budget changes nothing — it already returned the interior
economic optimum, so the budget was never binding. The QPSO gene `beta` scales
down the charter rate the solver prices against (`beta=0` commercial optimum,
`beta=1` fuel-minimal), and the true rate is restored before anything is
reported. `test_beta_actually_slows_the_fleet_down` guards it.

**5. Repair runs before the speed solve.** Tide windows, congestion and convoy waits
all change the time budget. Reversed, the speeds are optimal for a deadline that does
not exist and nothing crashes to tell you.

## Watch the demo output

The C08 trade-off curve shows `lam` falling from $122k/day at a 3.2-day budget to
$24,000/day at 5.4 days — at which point it equals the charter rate and stops moving.
That is the deadline going slack: past 5.4 days the ship sails at its economic
optimum and extra time buys nothing.

## Layout

```
fleetopt/
├── data/                    your 13 CSVs
├── fleetopt/
│   ├── io/       schema.py loader.py
│   ├── model/    vessel logic in schema; network.py ports.py emissions.py
│   ├── inner/    speed_solve.py           <- the core
│   ├── repair/   decoder.py               <- 13 rules
│   ├── master/   (M3–M4)
│   ├── outer/    (M5)
│   └── benchmark/(M6)
├── tests/        test_loader.py test_speed_solve.py test_decoder.py
└── scripts/      demo_m2.py
```
