"""Typed representations of every entity in the dataset.

Physics that belongs to a single entity lives on that entity (vessel fuel curve,
draft-vs-load-factor). Anything spanning entities lives in fleetopt/model/.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


# --------------------------------------------------------------------------- #
# Vessel
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Vessel:
    vessel_id: str
    vessel_name: str
    vessel_type: str
    capacity: float
    capacity_unit: str            # "MT" or "TEU"
    gross_tonnage: float
    design_draft_m: float
    ballast_draft_m: float
    min_speed_kn: float
    max_speed_kn: float
    design_speed_kn: float
    fuel_a: float                 # burn (t/day) = fuel_a * speed_kn ** fuel_b
    fuel_b: float
    aux_sea_t_per_day: float
    aux_port_t_per_day: float
    aux_anchor_t_per_day: float
    fuel_tank_capacity_t: float
    min_fuel_reserve_t: float
    lightship_t: float
    ballast_capacity_t: float
    min_load_factor: float
    max_load_factor: float
    min_trim_m: float
    max_trim_m: float
    shore_power_capable: bool
    can_switch_fuel_at_sea: bool
    current_cii_rating: str
    eexi_gco2_per_tnm: float
    charter_rate_usd_per_day: float
    available_from: datetime
    start_port: str
    drydock_from: Optional[datetime]
    drydock_to: Optional[datetime]

    # ---- physics ---------------------------------------------------------- #
    def draft_at(self, load_factor: float) -> float:
        """Actual draft rises linearly from ballast to design with load factor.

        This is what makes load factor a *decision*: part-loading buys access to
        a shallow port at the cost of carrying less cargo.
        """
        lf = min(max(load_factor, 0.0), 1.0)
        return self.ballast_draft_m + (self.design_draft_m - self.ballast_draft_m) * lf

    def max_load_factor_for_draft(self, available_draft_m: float) -> float:
        """Largest load factor that still fits the given depth. Can be negative
        (meaning: not even in ballast) -- callers must check."""
        span = self.design_draft_m - self.ballast_draft_m
        if span <= 1e-9:
            return 1.0 if available_draft_m >= self.ballast_draft_m else -1.0
        return (available_draft_m - self.ballast_draft_m) / span

    def main_engine_burn(self, speed_kn: float, resistance_multiplier: float = 1.0) -> float:
        """Tonnes per day at through-water speed. Weather scales it."""
        if speed_kn <= 0:
            return 0.0
        return self.fuel_a * speed_kn ** self.fuel_b * resistance_multiplier

    def is_in_drydock(self, when: datetime) -> bool:
        if self.drydock_from is None or self.drydock_to is None:
            return False
        return self.drydock_from <= when <= self.drydock_to


# --------------------------------------------------------------------------- #
# Port / network
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Port:
    port_code: str
    port_name: str
    country: str
    sea_area: str
    lat: float
    lon: float
    max_draft_m: float
    channel_depth_m: float
    tidal_restricted: bool
    n_berths: int
    operating_hours_per_day: float
    shore_power: bool
    tug_available: bool
    in_eca: bool
    port_dues_usd_per_gt: float
    pilotage_tug_usd: float
    shore_power_usd_per_mwh: float

    @property
    def is_24h(self) -> bool:
        return self.operating_hours_per_day >= 24.0


@dataclass(frozen=True)
class Leg:
    leg_id: str
    from_port: str
    to_port: str
    distance_nm: float
    sea_area: str
    eca_fraction: float
    one_way_traffic: bool
    max_speed_kn: float
    canal_toll_usd_per_gt: float
    restriction_note: str = ""


@dataclass(frozen=True)
class Fuel:
    fuel_id: str
    fuel_name: str
    lcv_mj_per_kg: float
    co2_ttw_t_per_t: float
    co2e_wtw_g_per_mj: float
    sulphur_pct_m: float
    eca_compliant: bool
    density_t_per_m3: float
    notes: str = ""

    def energy_mj(self, tonnes: float) -> float:
        return tonnes * 1000.0 * self.lcv_mj_per_kg

    def tonnes_for_energy(self, mj: float) -> float:
        """Methanol trap lives here: half the LCV means double the tonnage."""
        return mj / (1000.0 * self.lcv_mj_per_kg)


@dataclass(frozen=True)
class BunkerOffer:
    port_code: str
    fuel_id: str
    available: bool
    price_usd_per_t: Optional[float]
    min_lot_t: Optional[float]
    bunkering_rate_t_per_h: Optional[float]


@dataclass(frozen=True)
class TideWindow:
    port_code: str
    window_start: datetime
    window_end: datetime
    max_sailing_draft_m: float
    high_water_m: float
    tide_phase: str


@dataclass(frozen=True)
class Congestion:
    port_code: str
    month: int
    mean_wait_h: float
    p50_wait_h: float
    p90_wait_h: float
    lognormal_mu: float
    lognormal_sigma: float
    berth_utilisation: float


@dataclass(frozen=True)
class Handling:
    port_code: str
    cargo_type: str
    handling_rate_per_h: float
    unit: str
    fixed_berthing_h: float
    fixed_departure_h: float


@dataclass(frozen=True)
class WeatherPoint:
    scenario: str
    sea_area: str
    date: datetime
    wind_kn: float
    wave_hs_m: float
    current_kn: float
    storm_flag: bool
    resistance_multiplier: float


@dataclass(frozen=True)
class Parcel:
    parcel_id: str
    origin_port: str
    dest_port: str
    cargo_type: str
    quantity: float
    unit: str
    laycan_start: datetime
    laycan_end: datetime
    delivery_deadline: datetime
    freight_revenue_usd: float
    demurrage_usd_per_day: float
    late_penalty_usd_per_day: float
    mandatory: bool


# --------------------------------------------------------------------------- #
# The whole instance
# --------------------------------------------------------------------------- #
@dataclass
class Instance:
    scenario: str
    vessels: dict[str, Vessel]
    ports: dict[str, Port]
    legs: dict[tuple[str, str], Leg]
    fuels: dict[str, Fuel]
    parcels: dict[str, Parcel]
    bunker: dict[tuple[str, str], BunkerOffer]
    tides: dict[str, list[TideWindow]]
    congestion: dict[tuple[str, int], Congestion]
    handling: dict[tuple[str, str], Handling]
    weather: dict[tuple[str, datetime], WeatherPoint]     # (sea_area, date)
    vessel_fuels: dict[str, list[str]]
    vessel_cargo: dict[str, list[str]]
    params: dict[str, str]
    horizon_start: datetime = field(default=None)
    horizon_days: int = 60

    # ---- convenience ------------------------------------------------------ #
    def param_f(self, key: str, default: float = 0.0) -> float:
        try:
            return float(self.params[key])
        except (KeyError, ValueError):
            return default

    def leg(self, a: str, b: str) -> Leg:
        try:
            return self.legs[(a, b)]
        except KeyError:
            raise KeyError(f"no leg {a}->{b} in the network") from None

    def has_leg(self, a: str, b: str) -> bool:
        return (a, b) in self.legs

    def compatible_vessels(self, parcel: Parcel) -> list[Vessel]:
        out = []
        for v in self.vessels.values():
            if parcel.cargo_type not in self.vessel_cargo.get(v.vessel_id, []):
                continue
            if v.capacity_unit != parcel.unit:
                continue
            if parcel.quantity > v.capacity * v.max_load_factor:
                continue
            o, d = self.ports[parcel.origin_port], self.ports[parcel.dest_port]
            if v.ballast_draft_m > min(o.max_draft_m, d.max_draft_m):
                continue
            out.append(v)
        return out

    def compatible_fuels(self, vessel: Vessel) -> list[Fuel]:
        return [self.fuels[f] for f in self.vessel_fuels[vessel.vessel_id]]
