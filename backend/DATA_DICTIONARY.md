# SIH26138 — mock fleet dataset

Synthetic but realistic instance for the India / Gulf / SE-Asia / Suez–Med–N.Europe
trade lanes. Horizon: **2026-09-15 + 60 days**. Seeded (`26138` / `261380`) so every
run reproduces byte-identically.

Regenerate with:

```bash
python gen_static.py && python gen_dynamic.py && python validate_and_demo.py
```

**Nothing here is confidential.** Values are representative of publicly reported
figures (port drafts from admiralty charts, bunker prices from Ship & Bunker style
indices, emission factors from IMO MEPC.364(79) and FuelEU Maritime). They are not
any real operator's data.

---

## Which level consumes what

| Level | Reads |
|---|---|
| **Master (dSB)** | `vessels`, `ports`, `legs`, `cargo_parcels`, both `*_compatibility` files, `bunker_availability_price`, `tide_windows`, `port_congestion` |
| **Inner (convex speed solve)** | `vessels` (fuel curve, aux load), `legs` (distance, ECA, speed cap), `weather_forecast`, `bunker_availability_price` (price), `fuels` |
| **Outer (Pareto)** | `fuels` (emission factors), `scenario_parameters`, charter rates and penalties |
| **Repair decoder** | `tide_windows`, `port_cargo_handling`, `port_congestion`, draft/capacity/reserve limits |

---

## 1. `vessels.csv` — 11 vessels

| Field | Unit | Notes |
|---|---|---|
| `vessel_type` | — | HANDYSIZE/SUPRAMAX/KAMSARMAX bulker, MR/AFRAMAX/VLCC tanker, 3 container sizes, coaster |
| `capacity` / `capacity_unit` | MT or TEU | |
| `design_draft_m`, `ballast_draft_m` | m | **Actual draft = ballast + (design − ballast) × load_factor.** This is what makes load factor a decision, not a constant. |
| `fuel_a`, `fuel_b` | — | Main-engine burn: `t/day = fuel_a × speed_kn ^ fuel_b`, calibrated so each ship burns a realistic figure at design speed (e.g. Supramax ≈ 28 t/d at 14 kn) |
| `aux_sea/port/anchor_t_per_day` | t/day | Auxiliary + boiler load. **Without this the optimizer recommends absurdly slow speeds** — it is what makes the fuel curve bowl-shaped instead of monotonic |
| `fuel_tank_capacity_t`, `min_fuel_reserve_t` | t | Reserve = 12% of capacity |
| `min/max_load_factor`, `min/max_trim_m` | — / m | Stability proxy — see note below |
| `current_cii_rating`, `eexi_gco2_per_tnm` | A–E / g·CO₂/t·nm | |
| `charter_rate_usd_per_day` | USD/day | Opportunity cost of the vessel |
| `start_port`, `available_from`, `drydock_from/to` | — | V05 is in dry dock 2–19 Nov |

**Stability:** modelled as the load-factor and trim envelope only. Full hydrostatics
(GM, righting arms, free-surface effect) needs the ship's loading computer and is out
of scope — say so explicitly in your writeup rather than faking it.

## 2. `ports.csv` — 19 ports

Mundra, Kandla, JNPT, Cochin, Tuticorin, Chennai, Krishnapatnam, Vizag, Paradip,
Haldia, Colombo, Singapore, Jebel Ali, Sohar, Port Said, Genoa, Algeciras, Rotterdam,
Shanghai.

Key fields: `max_draft_m`, `channel_depth_m`, `tidal_restricted`, `n_berths`,
`operating_hours_per_day`, `shore_power`, `tug_available`, `in_eca`,
`port_dues_usd_per_gt`, `pilotage_tug_usd`, `shore_power_usd_per_mwh`.

Haldia is deliberately the hard one: 12 h/day operating window, no bunkering, tide-gated.

## 3. `legs.csv` — 60 directed legs

`distance_nm`, `sea_area`, `eca_fraction` (share of the leg inside an emission control
area), `one_way_traffic`, `max_speed_kn`, `canal_toll_usd_per_gt`, `restriction_note`.

Suez transits and the Hooghly approach carry `one_way_traffic = 1` and an 8 kn cap.
The 8 legs with `eca_fraction > 0` force MGO or LNG for that share of the distance.

## 4. `fuels.csv` — VLSFO, MGO, LNG, MEOH, B24

`lcv_mj_per_kg`, `co2_ttw_t_per_t`, `co2e_wtw_g_per_mj`, `sulphur_pct_m`,
`eca_compliant`, `density_t_per_m3`.

Methanol's LCV is half VLSFO's — the optimizer must carry roughly double the tonnage
for the same energy. That interacts with `fuel_tank_capacity_t` and is a genuine trap.

## 5. `bunker_availability_price.csv` — 95 rows (19 ports × 5 fuels)

`available`, `price_usd_per_t`, `min_lot_t`, `bunkering_rate_t_per_h`.
LNG at 6 ports, methanol at 2 (Singapore, Rotterdam), Haldia supplies nothing.
This is what creates real re-bunkering decisions — a methanol ship crossing the Bay
of Bengal has no refuelling option until Singapore.

## 6. `weather_forecast.csv` — 1,800 rows (3 scenarios × 10 sea areas × 60 days)

`scenario` ∈ {BASE, CALM, ROUGH}, `wind_kn`, `wave_hs_m`, `current_kn`, `storm_flag`,
`resistance_multiplier`.

The multiplier (1.00–1.65) scales main-engine burn: `1 + 0.055·Hs^1.5 + 0.008·(wind/10)²`.
Bay of Bengal carries a 3.5%/day cyclone probability in this window; current is signed,
so a favourable set genuinely reduces required through-water speed.

## 7. `tide_windows.csv` — 348 windows

Semidiurnal (12.42 h M2 period) with a 14.77-day spring/neap cycle, for Kandla, Haldia
and JNPT. `max_sailing_draft_m` = datum depth + ½ high water − under-keel clearance.

Haldia ranges 7.20–8.80 m. Ten of eleven vessels can enter *in ballast*; only one can
at full load. That is the coupling you want — the optimizer must trade cargo tonnes
against port access and tide timing.

## 8. `port_congestion.csv` — 57 rows (19 ports × 3 months)

Lognormal waiting-time distribution: `mean_wait_h`, `p50_wait_h`, `p90_wait_h`,
`lognormal_mu`, `lognormal_sigma`, `berth_utilisation`. October is the peak month.

Sample waiting time as `exp(mu + sigma·Z)` per scenario draw. **Predicted waiting is
an input; chosen waiting (just-in-time arrival) is a decision variable.** Keep them
in separate columns in your solution schema or you will confuse yourself.

## 9. `port_cargo_handling.csv` — 109 rows

`handling_rate_per_h`, `fixed_berthing_h`, `fixed_departure_h` by port and cargo type.
Rates are a base figure per commodity scaled by a port productivity factor
(Singapore 1.35 → Haldia 0.68).

## 10. `cargo_parcels.csv` — 24 parcels

`origin_port`, `dest_port`, `cargo_type`, `quantity`, `laycan_start`, `laycan_end`,
`delivery_deadline`, `freight_revenue_usd`, `demurrage_usd_per_day`,
`late_penalty_usd_per_day`, `mandatory`.

14 mandatory, 10 optional — so the optimizer can also decide *what not to carry*.

## 11. `scenario_parameters.csv` — 14 global levers

EU ETS price and scope, FuelEU GHG target and penalty, fleet carbon budget, ECA and
global sulphur limits, NOx tier, reference SFOC, CII reduction factor.

## 12. `vessel_fuel_compatibility.csv`, `vessel_cargo_compatibility.csv`

Long-form lookup tables. `is_primary` flags each ship's default fuel.

---

## Instance difficulty (from `validate_and_demo.py`)

- 81 feasible (parcel, vessel) pairs, 3.4 vessels per parcel on average
- 36 of 209 vessel–port pairs require part-loading to enter
- ~10⁴² assignment combinations — far past enumeration
- Only 1 of 19 ports can take the VLCC at full draft

## Known gaps (state these in your writeup)

1. Full hydrostatic stability is proxied by load-factor and trim bounds.
2. Distances are great-circle-ish estimates, not routed around land.
3. Weather is synthetic AR-free noise, not a real GFS/ECMWF pull. Swap in real
   forecast data before making any accuracy claim.
4. Bunker prices are a static snapshot, not a forward curve.
