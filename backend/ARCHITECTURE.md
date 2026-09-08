# SIH26138 — Complete Technical Architecture
## Quantum-inspired bilevel multi-objective fleet optimizer

Version 2.0. Supersedes the M5 architecture after the M6 benchmark result.

---

## 0. What is quantum here, and what is not

State this on your first slide. A judge will ask, and the answer must be correct.

| Component | Status |
|---|---|
| QUBO / Ising Hamiltonian construction | **Real.** Identical formulation to what you would submit to D-Wave, IBM, or a Fujitsu Digital Annealer. |
| Discrete Simulated Bifurcation (dSB) | **Quantum-inspired, classical.** A deterministic numerical integration of the Kerr-nonlinear parametric oscillator network that adiabatic quantum annealers physically realise. No qubits, no superposition, no entanglement. |
| QPSO variation operator | **Quantum-inspired, classical.** Sampling from a delta-potential-well probability density. The "quantum" is the wavefunction-derived sampling law, not a quantum computation. |
| Qubits, gates, circuits | **Not present in the production path.** Section 6 specifies the QAOA circuit for the same Hamiltonian, with an honest feasibility analysis showing why it is a side experiment and not the deliverable. |

**Do not claim to run circuits you do not run.** The defensible claim is: *we formulate the discrete sub-problem as an Ising Hamiltonian — hardware-ready — and solve it with a classical simulation of the same physics, benchmarked against both classical metaheuristics and the quantum-circuit alternative.*

---

## 1. System architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ L4  DECISION SURFACE                                                 │
│     Pareto archive · knee detection · ε-constraint compliance sweep   │
└───────────────────────────────▲──────────────────────────────────────┘
                                │ (f₁ cost, f₂ CO₂e, f₃ lateness)
┌───────────────────────────────┴──────────────────────────────────────┐
│ L3  MULTI-OBJECTIVE SEARCH — SMS-EMOA                                │
│     steady-state · hypervolume-contribution selection                 │
│     variation: QPSO (quantum-behaved sampling)   ← quantum-inspired   │
│     seeding:   dSB weight sweep injected at gen 0 ← quantum-inspired   │
└───────────────────────────────▲──────────────────────────────────────┘
             genome x ∈ [0,1]²ᴾ │ decoded plan
┌───────────────────────────────┴──────────────────────────────────────┐
│ L2  ISING / QUBO LAYER                                               │
│     option enumeration → binary encoding → Q matrix → J, h spins      │
│     dSB dynamics (Section 5) │ QAOA circuit path (Section 6)          │
└───────────────────────────────▲──────────────────────────────────────┘
             discrete plan      │ exact cost, CO₂e, arrival
┌───────────────────────────────┴──────────────────────────────────────┐
│ L1  NON-LINEAR CONTINUOUS LAYER — exact convex solve                 │
│     speed profile · load factor · bunker quantity · waiting time      │
│     bisection on λ (USD/day) + closed-form per leg                    │
└───────────────────────────────▲──────────────────────────────────────┘
                                │ legal schedule + time budget
┌───────────────────────────────┴──────────────────────────────────────┐
│ L0  HARD MARITIME CONSTRAINT LAYER — repair decoder                  │
│     draft·tide·UKC·reserve·ECA·hours·laycan·stability·drydock         │
│     GUARANTEE: no illegal plan can exist above this line              │
└──────────────────────────────────────────────────────────────────────┘
```

**Design invariant, enforced by construction:** an infeasible plan cannot reach
L2. The Hamiltonian therefore carries no physical-constraint penalty terms at
all — only two structural ones (Section 4.3). This is what makes the hard
maritime constraints *guaranteed* rather than *penalised*.

---

## 2. Variable taxonomy — what goes where

The entire architecture follows from this split.

### 2.1 Discrete variables → binary → spins → L2

| Variable | Domain | Cardinality (24-parcel instance) |
|---|---|---|
| vessel ↔ parcel assignment | categorical | 11 vessels |
| route selection | categorical | 3 (Yen's k-shortest) |
| fuel type per voyage | categorical | 2–3 per vessel |
| bunker port | categorical | 0–3 on-route |
| berth slot / shore power | binary | 2 |
| serve or skip (optional parcels) | binary | 2 |

### 2.2 Continuous variables → convex program → L1

| Variable | Domain | Non-linearity |
|---|---|---|
| speed per sub-leg `uᵢ` | ℝ⁺, [v_min, v_max] | **cubic**: burn ∝ a·u³·m |
| load factor `LF` | [LF_min, LF_max] | affine in draft, non-linear in resistance |
| bunker quantity `qⱼ` | ℝ⁺, semi-continuous | linear, min-lot integrality |
| trim | [trim_min, trim_max] | quadratic in resistance |
| waiting time `w` | ℝ⁺ | linear in aux burn |

**Critical:** none of these ever enters the Hamiltonian. Binary-encoding a
continuous variable costs ⌈log₂(range/precision)⌉ spins each and produces energy
coefficients spanning many orders of magnitude, which is the documented failure
mode of QUBO formulations of mixed-integer problems. Speed at 0.1 kn resolution
over [8, 23] kn is 8 spins × 40 sub-legs = 320 extra spins per voyage, for a
worse answer than the closed form gives free.

---

## 3. Encoding pipeline — CSV to spins

Six stages. Stage 4 is the "encode the inputs to qubits" step.

```
[1] RAW INPUT          13 CSVs → typed dataclasses
        ↓                loader.py, validation raises on any inconsistency
[2] FEASIBILITY         L0 repair decoder, 13 hard rules
        ↓                infeasible combinations DELETED, not penalised
[3] EXACT PRICING       L1 convex solve per surviving combination
        ↓                → (cost, CO₂e, lateness, time-slot) per option
[4] BINARY ENCODING     one binary xₖ per surviving option        ← "to qubits"
        ↓                851 binaries @ 24 parcels; 13,196 @ 96
[5] HAMILTONIAN         Q matrix → Ising (J, h) via exact transform
        ↓
[6] DYNAMICS            dSB integration, or QAOA circuit (Section 6)
```

### 3.1 Stage 4 in detail — the option-indicator encoding

An **option** is one complete way of serving one parcel:

```
k = (parcel p, vessel v, route r, fuel f, bunker port b)
```

Encoding choice: **one-hot over options**, not binary-coded fields. Compare:

| Scheme | Spins @ 24 parcels | Constraint terms | Coefficient range |
|---|---|---|---|
| Binary-coded fields (v, r, f, b separately) | ~180 | product terms, degree > 2 | 10⁶ |
| **One-hot over options** | **851** | quadratic only | 10⁰–10¹ |

The one-hot encoding uses more spins but produces a **naturally quadratic**
Hamiltonian with well-conditioned coefficients. Degree reduction of the
binary-coded alternative would require ancilla spins and reintroduce the
coefficient-scaling pathology. Spin count is cheap on a classical annealer;
conditioning is not.

Mapping:

```
xₖ ∈ {0,1}   =  1 iff option k is executed
P(k)         =  the parcel option k serves
V(k)         =  the vessel option k uses
[sₖ, eₖ]     =  the time slot option k occupies on V(k)
Ĉₖ           =  scalarised cost of option k, normalised to [0,1]
```

### 3.2 Objective normalisation before encoding

```
f₁ ∈ ~10⁷ USD      f₂ ∈ ~10⁴ t CO₂e      f₃ ∈ ~10⁰ days
```

Each is min-max normalised across the option set *before* scalarisation.
Unnormalised, the Hamiltonian is a cost-only objective wearing a costume, and the
Pareto front collapses onto the f₁ axis.

```
Ĉₖ = w₁·ñ₁(k) + w₂·ñ₂(k) + w₃·ñ₃(k),     ñⱼ(k) = (fⱼ(k) − min fⱼ) / (max fⱼ − min fⱼ)
```

---

## 4. Hamiltonian construction

### 4.1 QUBO form

```
H(x) = Σₖ Ĉₖ xₖ                                          [objective, linear]
     + A · Σ_{p ∈ mandatory} ( Σ_{k: P(k)=p} xₖ − 1 )²   [exactly-one]
     + A · Σ_{p ∈ optional}  Σ_{k<k′: P=p} xₖ xₖ′        [at-most-one]
     + A · Σ_{(k,k′) ∈ 𝒞} xₖ xₖ′                         [no double-booking]
```

where 𝒞 = {(k,k′) : V(k) = V(k′) and slots overlap}.

Expanding the square using xₖ² = xₖ for binaries:

```
( Σₖ xₖ − 1 )²  =  −Σₖ xₖ  +  2 Σ_{k<k′} xₖ xₖ′  +  1
```

so the exactly-one term contributes **−A to each diagonal** and **+A to each
off-diagonal pair** within the parcel group.

### 4.2 Penalty weight

```
A = 1.5 · max( 1, 4 · maxₖ |Ĉₖ| )
```

**A must be recomputed every time the scalarisation weights change.** SMS-EMOA
does not re-scalarise, but the dSB seeding sweep does — once per weight vector.
A stale A is the classic silent failure: either constraints stop binding, or the
objective signal is drowned and the solver returns an arbitrary feasible point.

### 4.3 What is deliberately absent

No term for draft, under-keel clearance, tidal window, fuel reserve, ECA
compliance, port operating hours, laycan, stability envelope, or drydock. Those
options were **deleted at Stage 2**. Only the two structural rules that a
quadratic binary form has no other way to express are penalised.

This is the guarantee: a penalty can be outweighed; a deleted option cannot be
chosen.

### 4.4 QUBO → Ising transform

Substituting xᵢ = (1 + sᵢ)/2 with sᵢ ∈ {−1, +1}, and writing Q̃ = (Q + Qᵀ)/2 with
diagonal d and off-diagonal block O:

```
Jᵢⱼ    = ½ Oᵢⱼ                    (symmetric, zero diagonal)
hᵢ     = ½ dᵢ + ½ Σ_{j≠i} Oᵢⱼ
const  = ½ Σᵢ dᵢ + ¼ Σᵢⱼ Oᵢⱼ

E(s) = Σ_{i<j} Jᵢⱼ sᵢ sⱼ + Σᵢ hᵢ sᵢ + const        [minimised]
```

Verified exactly on 4,000 random instances (`test_qubo_to_ising_is_exact`).

### 4.5 Instance sizes measured

| Parcels | Vessels | Spins | Coupling density | Non-zero Jᵢⱼ |
|---|---|---|---|---|
| 24 | 11 | 851 | 9.3% | ~33,700 |
| 48 | 22 | 3,299 | ~7% | ~380,000 |
| 96 | 44 | 13,196 | ~5% | ~4.4 M |

---

## 5. Discrete Simulated Bifurcation — dynamics and cycle timing

### 5.1 Physical model

dSB numerically integrates a network of Kerr-nonlinear parametric oscillators —
the same physical system an adiabatic quantum annealer realises, but simulated
classically with the quantum noise term dropped. Each spin has a position `xᵢ`
(the "ball" in a potential well) and a conjugate momentum `yᵢ`.

A pumping parameter `a(t)` is ramped from 0 to `a₀`. Below threshold the
potential has one minimum; above it the well **bifurcates** into two, and every
oscillator is forced to commit to a sign. Because the network is coupled through
J, they commit *collectively* into a low-energy configuration.

### 5.2 Equations of motion

```
yᵢ ← yᵢ + [ −(a₀ − a(t))·xᵢ  −  c₀·( Σⱼ Jᵢⱼ·sgn(xⱼ) + hᵢ ) ]·Δt
xᵢ ← xᵢ + a₀·yᵢ·Δt

if |xᵢ| > 1:   xᵢ ← sgn(xᵢ),   yᵢ ← 0          [inelastic walls]
```

**`sgn(xⱼ)` rather than `xⱼ` is what makes this *discrete* SB.** Ballistic SB
(bSB) uses the raw position, which lets analog amplitude error accumulate and
degrades quality on large instances. The sign clamp suppresses it.

### 5.3 Schedules and constants

| Symbol | Value | Role |
|---|---|---|
| `a₀` | 1.0 | final pumping amplitude |
| `a(t)` | `a₀ · (t+1)/T` | linear pumping ramp |
| `c₀` | `0.5 / (σ_J · √N)` | coupling scale, σ_J = RMS of J |
| `Δt` | 0.5 | integration step (dimensionless) |
| `T` | 250–1200 | steps per run |
| `M` | 8–48 | parallel agents (independent replicas) |
| precision | float32 | 2× throughput, no measured quality loss |

`c₀` normalisation is essential: it puts the coupling term on the same footing
as the detuning term regardless of N or coefficient magnitude, so the same
`Δt` and `T` work across instance sizes without retuning.

### 5.4 Cycle timing — measured, 851 spins

| Stage | Operation | Cost | Wall clock |
|---|---|---|---|
| **per integration step** | `S @ J` (M×N × N×N) | 2·M·N² flop = 5.8 MFLOP @ M=8 | **0.36 ms** |
| | momentum + position update | 4·M·N flop | < 0.01 ms |
| | wall clamp | M·N compare | < 0.01 ms |
| **per tracking interval** | energy eval every 250 steps | 2·M·N² flop | 0.7 ms |
| **per dSB run** | T = 250 steps | 1.45 GFLOP | **90 ms** |
| | T = 800 steps | 4.6 GFLOP | 580 ms |
| | T = 1200 steps, M=48 | 41 GFLOP | 1,120 ms |
| **post-processing** | single-bit-flip descent, rank-1 field updates | O(N) per flip | 5–15 ms |

Sustained throughput ≈ 16 GFLOP/s (numpy/BLAS, single CPU core).

**GPU projection.** At N = 851 the matrices are too small to amortise kernel
launch — expect only 3–5×. At N = 13,196 (96 parcels) the step cost is
2·M·N² = 2.8 GFLOP; a mid-range GPU at ~10 TFLOP/s fp32 gives 30–50×. **dSB's
advantage is a function of N, and below ~10³ spins it does not exist.** This is
the measured basis for the M6 result, not speculation.

### 5.5 Convergence

`a(t)` ramping linearly over T steps is an adiabatic-like schedule: too fast and
the system quenches into a local minimum; too slow and you waste budget. T = 250
was empirically sufficient at N = 851 (energy −72.1 vs −77.7 at T = 1200 —
7% worse energy for 6× less time, a good trade inside an evolutionary loop
where dSB only seeds).

---

## 6. Quantum circuit path (QAOA) — specification and honest feasibility

The Hamiltonian in Section 4 is hardware-ready. This section specifies the
circuit exactly, then explains why it is a side experiment.

### 6.1 Qubit mapping

One logical qubit per option binary. `xₖ → qubit k`, `|0⟩ = not executed`,
`|1⟩ = executed`. Computational-basis measurement yields a candidate plan
directly.

### 6.2 Circuit structure, depth p

```
|0⟩^⊗N ─[ H^⊗N ]─┬─[ U_C(γ₁) ]─[ U_B(β₁) ]─┬─ ... ─┬─[ U_C(γ_p) ]─[ U_B(β_p) ]─┤ measure
                 └───────── layer 1 ────────┘       └────── layer p ───────────┘
```

**Cost layer** `U_C(γ) = e^{−iγH_C}`, decomposed from the Ising form:

```
for each i:        RZ(2γhᵢ)  on qubit i
for each (i,j) with Jᵢⱼ ≠ 0:
                   CNOT(i,j) · RZ(2γJᵢⱼ) on j · CNOT(i,j)
```

**Mixer layer.** Two options:

- *Standard X-mixer*: `U_B(β) = Π_i RX(2β)`. Simple, but explores the full
  2^N space including the (vast majority) infeasible one-hot violations.
- **XY-mixer (recommended)**: restrict evolution to the feasible one-hot
  subspace per parcel. For parcel p with option set S_p, apply
  `Π_{(i,j) ∈ ring(S_p)} e^{−iβ(XᵢXⱼ + YᵢYⱼ)/2}`, initialised in a Dicke
  state `|D¹_{|S_p|}⟩` (exactly one excitation). This makes the exactly-one
  constraint **structurally enforced by the mixer** rather than penalised —
  the circuit analogue of our repair-decoder philosophy, and the same fix the
  recent constraint-aware QAOA-for-VRP literature applies.

Note the no-double-booking constraint has no equivalent mixer symmetry and must
remain a penalty term in H_C.

### 6.3 Resource estimate — 24-parcel instance

| Quantity | Value |
|---|---|
| Logical qubits | 851 |
| Non-zero Jᵢⱼ (ZZ terms) | ~33,700 |
| Two-qubit gates per cost layer | ~67,400 (2 CNOT per ZZ) |
| Two-qubit gate depth per layer (perfect connectivity) | ~150 |
| Two-qubit gate depth per layer (heavy-hex, with SWAP routing) | ~10⁴ |
| ECR gate time (IBM-class) | ~500 ns |
| Wall time per cost layer, routed | ~5 ms |
| T₂ coherence budget | 100–300 μs |
| **Coherence-limited depth** | **~600 two-qubit gates** |
| **Required depth (p=1, routed)** | **~10⁴ gates** |

**Deficit ≈ 17×, at p = 1, before error correction.** Sparse hardware
connectivity is the dominant cost; SWAP routing inflates depth by roughly two
orders of magnitude over the all-to-all ideal.

### 6.4 What is actually demonstrable

Reduce to a 6-parcel sub-instance: ~40 options → 40 qubits, ~150 ZZ terms,
routed depth ~600. This fits within coherence on current hardware and within
statevector simulation (2⁴⁰ is too large for exact simulation, but 20 qubits /
12 parcels is comfortable at 2²⁰ amplitudes).

**Recommended deliverable:** run QAOA p = 1–3 on a 12-parcel reduction using
Qiskit Aer, compare its approximation ratio against dSB and exact MILP on the
identical Hamiltonian, and present the resource table above as the reason the
full instance runs on the classical dynamics. That is a defensible, complete
quantum story. Claiming to run 851 qubits is not.

---

## 7. Non-linear constraint handling — the exact convex layer

This is the architecture's genuine technical contribution and the reason
non-linearity never contaminates the Hamiltonian.

### 7.1 Problem

For a **fixed** discrete plan, over sub-legs i = 1..n:

```
uᵢ(tᵢ) = dᵢ/(24tᵢ) − cᵢ                     through-water speed, kn
Fᵢ(tᵢ) = a·mᵢ·tᵢ·uᵢ(tᵢ)^b + aux·tᵢ          fuel, tonnes

min  Σᵢ price·Fᵢ(tᵢ)
s.t. Σᵢ tᵢ ≤ T_avail
     dᵢ/(24(v_max + cᵢ)) ≤ tᵢ ≤ dᵢ/(24(v_min + cᵢ))
     tᵢ respects per-leg legal caps (canal, channel)
```

Non-linearities present: cubic speed-fuel law (b ≈ 3), added wave resistance
multiplier mᵢ, signed current cᵢ, hull resistance as a function of draft (hence
of load factor).

### 7.2 Convexity

For b ≥ 1 and uᵢ > 0, Fᵢ is convex in tᵢ. With cᵢ = 0, b = 3 it reduces to
`F = A/t² + aux·t`, manifestly convex. Convexity is **verified numerically in
CI** for every vessel × sea-area pair (`verify_convexity`), with a
golden-section fallback if it ever fails — the code does not assume the property
it depends on.

### 7.3 Separable Lagrangian and closed form

```
L(t, λ) = Σᵢ [ price·Fᵢ(tᵢ) + λ·tᵢ ]
```

separates completely. For fixed λ each leg is solved independently. With b = 3,
c = 0, stationarity `dF/dt = −λ/price` gives

```
tᵢ* = ( 2Aᵢ / (aux + λ/price) )^{1/3},      Aᵢ = a·mᵢ·dᵢ³/24³
```

clipped to `[t_min, t_max]`. With current or b ≠ 3, Brent's method on the
identical first-order condition. Σtᵢ(λ) is monotone decreasing in λ, so
**bisection on λ is exact** — 80 iterations, ~2 ms per voyage.

### 7.4 λ is the deliverable

λ has units **USD/day**: the marginal value of one more day of voyage time. At
the optimum, every unclipped leg saves exactly λ/price tonnes of fuel per extra
day — the KKT condition, asserted in `test_kkt_equal_marginal_savings`. This is
directly actionable by a chartering desk and is the single most defensible
number the system produces.

### 7.5 Why this beats discretisation

| | Binned QUBO (competitors) | This architecture |
|---|---|---|
| Speed resolution | 1 kn (5 bins) | continuous, exact |
| Extra spins per voyage | ~320 | 0 |
| Coefficient conditioning | 10⁶ range | not applicable |
| Optimality | approximate | **provably global** |
| Solve time | inside the annealer | 2 ms, outside it |

Fuel scales with the cube of speed: the 0.4 kn a 1-knot bin cannot resolve is
worth ~8% of burn. Discretisation throws away the prize to fit the solver.

### 7.6 Coupled continuous variables

- **Load factor** — golden-section over LF with the speed solve nested inside;
  bounded by port depth at every call, since draft = ballast + (design −
  ballast)·LF.
- **Bunker quantity** — LP given fixed bunker ports; min-lot semi-continuity
  handled by enumerating ≤ 2⁵ on/off patterns.
- **Waiting time** — enters the budget as a decision, so the solver naturally
  prefers slow-steaming over anchoring (aux burn at anchor exceeds the fuel
  saved by arriving early). That result *is* the just-in-time arrival finding.

---

## 8. Hard maritime constraint guarantee — L0

### 8.1 Two-tier scheme

| Tier | Constraint class | Mechanism | Can it be violated? |
|---|---|---|---|
| **Hard** | all physical, operational, regulatory | option deleted at Stage 2 | **No — the option does not exist** |
| **Structural** | exactly-one, no double-booking | Hamiltonian penalty + decode-repair | No — repair is unconditional |
| **Soft** | carbon budget, FuelEU, CII band | ε-constraint at L3 | By design, and priced |

### 8.2 The 13 rules, applied in order

| # | Rule | Action | Source |
|---|---|---|---|
| 1 | vessel–cargo compatibility | reject | `vessel_cargo_compatibility` |
| 2 | vessel–fuel compatibility | reject | `vessel_fuel_compatibility` |
| 3 | ballast draft ≤ port depth at every **call** port | reject | `ports` |
| 4 | laden draft(LF) ≤ port depth | **reduce LF**; reject below LF_min | `ports`, `vessels` |
| 5 | tidal gating | snap ETA to next window with sufficient `max_sailing_draft_m`; add wait | `tide_windows` |
| 6 | port operating hours | delay to next opening | `ports.operating_hours_per_day` |
| 7 | congestion | add queueing time from lognormal(μ, σ) | `port_congestion` |
| 8 | cargo handling | qty/rate + fixed berthing + departure | `port_cargo_handling` |
| 9 | ECA sulphur compliance | force compliant fuel for `eca_fraction`; **whole leg** if the vessel cannot switch at sea | `legs`, `fuels`, `vessels` |
| 10 | one-way traffic / speed caps | clamp v_max per leg; add convoy wait | `legs` |
| 11 | minimum fuel reserve | insert bunker stop at cheapest reachable supplier; reject if none | `bunker_availability_price` |
| 12 | drydock | reject on overlap | `vessels` |
| 13 | laycan | reject if origin arrival > laycan_end | `cargo_parcels` |

Plus: tank-capacity check against LCV-corrected tonnage (the methanol trap —
19.9 MJ/kg vs VLSFO's 40.2 means double the mass for the same energy).

### 8.3 Ordering invariant

**Rules 5, 7 and 11 change the time budget. L1 must run after L0, never before.**
Reversed, the speed profile is optimal for a deadline that does not exist, and
nothing crashes to tell you. This is the highest-probability defect in the whole
system.

### 8.4 Draft is a function of load factor

```
draft(LF) = ballast_draft + (design_draft − ballast_draft) · LF
```

Treating draft as constant removes the most interesting coupling in the domain —
part-loading buys access to a shallow port at the cost of carrying less cargo.
On the reference instance, 36 of 209 vessel–port pairs require part-loading.

### 8.5 Waypoint vs call port

Draft binds **only where the vessel berths**: origin, destination, bunker stop.
A VLCC sailing past Cochin is not constrained by Cochin's 14.5 m. Conflating
waypoints with calls silently kills every large-vessel option on a coastal route.

### 8.6 Stability

Modelled as a load-factor and trim envelope, not full hydrostatics. Full GM /
righting-arm / free-surface analysis requires the vessel's hydrostatic tables and
is delegated to the onboard loading computer — which is what happens in real
operations. **State this limitation explicitly rather than implying it is
modelled.**

---

## 9. Multi-objective layer — L3

### 9.1 Objectives

```
f₁  total cost (USD)   = fuel + charter + port dues + canal tolls + ETS
                         + shore power + late penalties + FuelEU penalty
                         + forfeit(unserved mandatory) − freight revenue
f₂  emissions (t CO₂e) = Σ fuel_t · WTW factor      [well-to-wake]
f₃  service violation  = Σ max(0, arrival − deadline), revenue-weighted
```

All minimised. Reported alongside: **carbon intensity g CO₂e/tonne-mile**, which
normalises for service level — absolute CO₂ rewards carrying less cargo, and
without the intensity figure the front is unreadable.

### 9.2 SMS-EMOA (revised from MOEA/D-AWA after M6)

Steady-state: generate one offspring, add to population, evict the individual
contributing least hypervolume.

Selected because its selection operator **directly optimises hypervolume**, the
reported metric. Every alternative optimises a proxy (scalarised weights,
crowding distance) and hopes HV follows. In the M6 benchmark it achieved
HV 0.769 against MOEA/D-AWA + dSB at 0.674, at equal wall clock.

### 9.3 QPSO variation — the quantum-inspired operator in the main loop

```
mbest = mean of personal bests
p     = φ·pbest + (1−φ)·gbest,                    φ ~ U(0,1)
x'    = p ± β·|mbest − x|·ln(1/u),                u ~ U(0,1)
β     : 1.0 → 0.4, linear over the run
```

Derived from the ground-state wavefunction of a delta potential well. The width
term contracts automatically as the swarm converges — wide exploration early,
fine tuning late.

**No rotation-angle lookup table.** The hand-tuned angle tables of classical
quantum GAs are the most-criticised element of that literature; their absence
here is a point to make explicitly. One parameter, on a fixed schedule.

### 9.4 Genome

```
x[0:P]    ∈ [0,1)  → which option serves parcel p (or skip, if optional)
x[P:2P]   ∈ [0,1]  → speed policy β for parcel p
```

Random-key encoding. Decode → `repair_solution` → `realise`.

**β semantics — a subtle and important point.** β does *not* raise the time
budget; the budget was never binding, since L1 already returns the interior
economic optimum. β **scales down the charter rate L1 prices against**:

```
tc_eff = charter_rate · max(0.02, 1 − β)
```

β = 0 gives the commercial optimum; β = 1 gives the fuel-minimal speed. The
**true** charter rate is restored before any cost is reported, so the extra days
are paid for honestly. This is what generates emissions reduction at constant
service level (5.8% CO₂ for 2.5% margin, intensity 4.6 → 4.4 g/t-mile).

### 9.5 Slot reservation

A vessel is reserved for `min(budget, optimal_duration × 1.35)`, not merely its
optimal duration. Otherwise slowing a voyage down silently creates a
double-booking. Costs some feasible pairings; this is the price of correctness.

### 9.6 dSB seeding

One weight sweep (~12 vectors, ~1.1 s at N = 851 with T = 250) injected into
generation 0 in place of random keys. Retains the Ising formulation on the
critical path at ~2% of a 60 s budget. **Run the three-way ablation** — random
init / dSB-seeded / dSB-seeded + QPSO — and report whichever wins.

---

## 10. End-to-end timing budget (24-parcel instance, 60 s)

| Stage | Operation | Time | Share |
|---|---|---|---|
| L0+L1 offline | enumerate + repair + exactly price 851 options | 1.1 s | 1.8% |
| L2 seeding | 12 dSB runs @ T=250, M=8 | 1.1 s | 1.8% |
| L3 search | ~5,500 SMS-EMOA evaluations @ ~10 ms | 55 s | 92% |
| L4 | archive maintenance, knee detection, HV | 2.8 s | 4.4% |

**The bottleneck is `realise()`, not dSB.** Each evaluation re-runs ~18 inner
convex solves at ~0.55 ms each. Memoising on `(option.idx, round(β, 2))` should
reuse 80–90% of them, since an offspring differs from its parent in only a few
genes. Expected gain: 5–10× more evaluations inside the same budget, for every
method. **Do this before any further algorithmic work.**

---

## 11. Verification matrix

| Property | Test | Status |
|---|---|---|
| QUBO ↔ Ising transform exact | 4,000 random instances | passing |
| F(t) convex, all vessels × sea areas | `verify_convexity` in CI | passing |
| λ = marginal cost of a day | finite difference vs analytic | passing, < 0.1% |
| KKT: equal marginal savings across unclipped legs | direct assertion | passing |
| Closed form ≡ Brent | 500 random legs, rel. error < 1e-9 | passing |
| No accepted plan violates any L0 rule | fuzz all options | passing |
| β cannot break a vessel slot | slow every voyage to max, check overlaps | passing |
| Discounted charter rate does not leak into reported cost | breakdown check | passing |
| Penalty weight A tracks the scalarisation | weight-change assertion | passing |
| HV requires a shared reference box | single point scores 1.0 on its own box | passing |
| Optimiser beats business-as-usual | end-to-end assertion | passing |

41 tests, ~3,500 lines.

---

## 12. Known limitations — state these before a judge finds them

1. **dSB loses to SMS-EMOA and NSGA-III at 24 parcels** at equal wall clock
   (0.674 / 0.769 / 0.743). The gap **widened** at 48 parcels. Diagnosis: 168
   evaluations vs 6,200 — dSB's per-call cost is not amortised below ~10³ spins.
   This reproduces, on your own problem, the published finding that previously
   studied instances were too small to establish advantage under careful runtime
   accounting.
2. **No quantum hardware execution.** Section 6 gives the resource deficit
   (~17× depth over coherence at p = 1, routed).
3. **Stability is a proxy**, not hydrostatics.
4. **Distances are estimates**, not land-routed geodesics.
5. **Weather is synthetic** noise, not a GFS/ECMWF pull. Swap in real forecast
   data before any accuracy claim.
6. **Bunker prices are a static snapshot**, not a forward curve.

The negative result in (1) is a stronger submission than a tuned win. You built
the method the literature recommends, benchmarked it honestly against strong
independent baselines at equal wall clock, and characterised exactly where it
does and does not pay off. Most entries will have benchmarked against nothing.
