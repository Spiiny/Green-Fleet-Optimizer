"""CSV -> Instance, with validation that fails loudly.

Silent row-dropping is how an optimizer ends up cheerfully solving the wrong
problem, so every referential check raises.
"""
from __future__ import annotations
import os
import pandas as pd
from datetime import datetime
from .schema import (Vessel, Port, Leg, Fuel, BunkerOffer, TideWindow, Congestion,
                     Handling, WeatherPoint, Parcel, Instance)


class InstanceError(ValueError):
    """Raised when the dataset is internally inconsistent."""


def _dt(x):
    if x is None or (isinstance(x, float) and pd.isna(x)) or x == "" or pd.isna(x):
        return None
    return pd.to_datetime(x).to_pydatetime()


def _csv(d, name):
    p = os.path.join(d, name + ".csv")
    if not os.path.exists(p):
        raise InstanceError(f"missing required file: {p}")
    return pd.read_csv(p)


def load_instance(data_dir: str, scenario: str = "BASE") -> Instance:
    D = data_dir

    # ---------------- vessels ---------------------------------------------- #
    vdf = _csv(D, "vessels")
    vessels = {}
    for _, r in vdf.iterrows():
        vessels[r.vessel_id] = Vessel(
            vessel_id=r.vessel_id, vessel_name=r.vessel_name, vessel_type=r.vessel_type,
            capacity=float(r.capacity), capacity_unit=r.capacity_unit,
            gross_tonnage=float(r.gross_tonnage),
            design_draft_m=float(r.design_draft_m), ballast_draft_m=float(r.ballast_draft_m),
            min_speed_kn=float(r.min_speed_kn), max_speed_kn=float(r.max_speed_kn),
            design_speed_kn=float(r.design_speed_kn),
            fuel_a=float(r.fuel_a), fuel_b=float(r.fuel_b),
            aux_sea_t_per_day=float(r.aux_sea_t_per_day),
            aux_port_t_per_day=float(r.aux_port_t_per_day),
            aux_anchor_t_per_day=float(r.aux_anchor_t_per_day),
            fuel_tank_capacity_t=float(r.fuel_tank_capacity_t),
            min_fuel_reserve_t=float(r.min_fuel_reserve_t),
            lightship_t=float(r.lightship_t), ballast_capacity_t=float(r.ballast_capacity_t),
            min_load_factor=float(r.min_load_factor), max_load_factor=float(r.max_load_factor),
            min_trim_m=float(r.min_trim_m), max_trim_m=float(r.max_trim_m),
            shore_power_capable=bool(r.shore_power_capable),
            can_switch_fuel_at_sea=bool(r.can_switch_fuel_at_sea),
            current_cii_rating=r.current_cii_rating,
            eexi_gco2_per_tnm=float(r.eexi_gco2_per_tnm),
            charter_rate_usd_per_day=float(r.charter_rate_usd_per_day),
            available_from=_dt(r.available_from), start_port=r.start_port,
            drydock_from=_dt(r.drydock_from), drydock_to=_dt(r.drydock_to))

    # ---------------- ports ------------------------------------------------- #
    pdf = _csv(D, "ports")
    ports = {r.port_code: Port(
        port_code=r.port_code, port_name=r.port_name, country=r.country,
        sea_area=r.sea_area, lat=float(r.lat), lon=float(r.lon),
        max_draft_m=float(r.max_draft_m), channel_depth_m=float(r.channel_depth_m),
        tidal_restricted=bool(r.tidal_restricted), n_berths=int(r.n_berths),
        operating_hours_per_day=float(r.operating_hours_per_day),
        shore_power=bool(r.shore_power), tug_available=bool(r.tug_available),
        in_eca=bool(r.in_eca), port_dues_usd_per_gt=float(r.port_dues_usd_per_gt),
        pilotage_tug_usd=float(r.pilotage_tug_usd),
        shore_power_usd_per_mwh=float(r.shore_power_usd_per_mwh))
        for _, r in pdf.iterrows()}

    # ---------------- legs -------------------------------------------------- #
    ldf = _csv(D, "legs")
    legs = {}
    for _, r in ldf.iterrows():
        note = "" if pd.isna(r.restriction_note) else str(r.restriction_note)
        legs[(r.from_port, r.to_port)] = Leg(
            leg_id=r.leg_id, from_port=r.from_port, to_port=r.to_port,
            distance_nm=float(r.distance_nm), sea_area=r.sea_area,
            eca_fraction=float(r.eca_fraction), one_way_traffic=bool(r.one_way_traffic),
            max_speed_kn=float(r.max_speed_kn),
            canal_toll_usd_per_gt=float(r.canal_toll_usd_per_gt), restriction_note=note)

    # ---------------- fuels ------------------------------------------------- #
    fdf = _csv(D, "fuels")
    fuels = {r.fuel_id: Fuel(
        fuel_id=r.fuel_id, fuel_name=r.fuel_name, lcv_mj_per_kg=float(r.lcv_mj_per_kg),
        co2_ttw_t_per_t=float(r.co2_ttw_t_per_t),
        co2e_wtw_g_per_mj=float(r.co2e_wtw_g_per_mj),
        sulphur_pct_m=float(r.sulphur_pct_m), eca_compliant=bool(r.eca_compliant),
        density_t_per_m3=float(r.density_t_per_m3),
        notes="" if pd.isna(r.notes) else str(r.notes)) for _, r in fdf.iterrows()}

    # ---------------- parcels ----------------------------------------------- #
    cdf = _csv(D, "cargo_parcels")
    parcels = {r.parcel_id: Parcel(
        parcel_id=r.parcel_id, origin_port=r.origin_port, dest_port=r.dest_port,
        cargo_type=r.cargo_type, quantity=float(r.quantity), unit=r.unit,
        laycan_start=_dt(r.laycan_start), laycan_end=_dt(r.laycan_end),
        delivery_deadline=_dt(r.delivery_deadline),
        freight_revenue_usd=float(r.freight_revenue_usd),
        demurrage_usd_per_day=float(r.demurrage_usd_per_day),
        late_penalty_usd_per_day=float(r.late_penalty_usd_per_day),
        mandatory=bool(r.mandatory)) for _, r in cdf.iterrows()}

    # ---------------- bunker ------------------------------------------------ #
    bdf = _csv(D, "bunker_availability_price")
    bunker = {}
    for _, r in bdf.iterrows():
        ok = bool(r.available)
        bunker[(r.port_code, r.fuel_id)] = BunkerOffer(
            port_code=r.port_code, fuel_id=r.fuel_id, available=ok,
            price_usd_per_t=float(r.price_usd_per_t) if ok else None,
            min_lot_t=float(r.min_lot_t) if ok else None,
            bunkering_rate_t_per_h=float(r.bunkering_rate_t_per_h) if ok else None)

    # ---------------- tides ------------------------------------------------- #
    tdf = _csv(D, "tide_windows").sort_values("window_start")
    tides: dict[str, list[TideWindow]] = {}
    for _, r in tdf.iterrows():
        tides.setdefault(r.port_code, []).append(TideWindow(
            port_code=r.port_code, window_start=_dt(r.window_start),
            window_end=_dt(r.window_end),
            max_sailing_draft_m=float(r.max_sailing_draft_m),
            high_water_m=float(r.high_water_m), tide_phase=r.tide_phase))

    # ---------------- congestion / handling / weather ----------------------- #
    gdf = _csv(D, "port_congestion")
    congestion = {(r.port_code, int(r.month)): Congestion(
        port_code=r.port_code, month=int(r.month), mean_wait_h=float(r.mean_wait_h),
        p50_wait_h=float(r.p50_wait_h), p90_wait_h=float(r.p90_wait_h),
        lognormal_mu=float(r.lognormal_mu), lognormal_sigma=float(r.lognormal_sigma),
        berth_utilisation=float(r.berth_utilisation)) for _, r in gdf.iterrows()}

    hdf = _csv(D, "port_cargo_handling")
    handling = {(r.port_code, r.cargo_type): Handling(
        port_code=r.port_code, cargo_type=r.cargo_type,
        handling_rate_per_h=float(r.handling_rate_per_h), unit=r.unit,
        fixed_berthing_h=float(r.fixed_berthing_h),
        fixed_departure_h=float(r.fixed_departure_h)) for _, r in hdf.iterrows()}

    wdf = _csv(D, "weather_forecast")
    wdf = wdf[wdf.scenario == scenario]
    if wdf.empty:
        raise InstanceError(f"no weather rows for scenario {scenario!r}")
    weather = {(r.sea_area, _dt(r.date)): WeatherPoint(
        scenario=r.scenario, sea_area=r.sea_area, date=_dt(r.date),
        wind_kn=float(r.wind_kn), wave_hs_m=float(r.wave_hs_m),
        current_kn=float(r.current_kn), storm_flag=bool(r.storm_flag),
        resistance_multiplier=float(r.resistance_multiplier)) for _, r in wdf.iterrows()}

    # ---------------- compatibility / params -------------------------------- #
    vf = _csv(D, "vessel_fuel_compatibility")
    vessel_fuels: dict[str, list[str]] = {}
    for _, r in vf.sort_values("is_primary", ascending=False).iterrows():
        vessel_fuels.setdefault(r.vessel_id, []).append(r.fuel_id)

    vc = _csv(D, "vessel_cargo_compatibility")
    vessel_cargo: dict[str, list[str]] = {}
    for _, r in vc.iterrows():
        vessel_cargo.setdefault(r.vessel_id, []).append(r.cargo_type)

    sdf = _csv(D, "scenario_parameters")
    params = {r.parameter: str(r.value) for _, r in sdf.iterrows()}

    inst = Instance(
        scenario=scenario, vessels=vessels, ports=ports, legs=legs, fuels=fuels,
        parcels=parcels, bunker=bunker, tides=tides, congestion=congestion,
        handling=handling, weather=weather, vessel_fuels=vessel_fuels,
        vessel_cargo=vessel_cargo, params=params,
        horizon_start=_dt(params.get("horizon_start", "2026-09-15")),
        horizon_days=int(float(params.get("horizon_days", 60))))
    validate(inst)
    return inst


# --------------------------------------------------------------------------- #
def validate(inst: Instance) -> None:
    """Every check here raises. None of them warn."""
    codes = set(inst.ports)
    errs: list[str] = []

    for (a, b) in inst.legs:
        if a not in codes: errs.append(f"leg references unknown port {a}")
        if b not in codes: errs.append(f"leg references unknown port {b}")
    for lg in inst.legs.values():
        if lg.distance_nm <= 0:
            errs.append(f"leg {lg.leg_id} has non-positive distance")
        if not 0.0 <= lg.eca_fraction <= 1.0:
            errs.append(f"leg {lg.leg_id} eca_fraction out of [0,1]")

    for v in inst.vessels.values():
        if v.start_port not in codes:
            errs.append(f"vessel {v.vessel_id} starts at unknown port {v.start_port}")
        elif v.ballast_draft_m > inst.ports[v.start_port].max_draft_m:
            errs.append(f"vessel {v.vessel_id} cannot physically sit at its start port")
        if v.ballast_draft_m > v.design_draft_m:
            errs.append(f"vessel {v.vessel_id} ballast draft exceeds design draft")
        if v.min_speed_kn >= v.max_speed_kn:
            errs.append(f"vessel {v.vessel_id} has an empty speed range")
        if v.aux_sea_t_per_day <= 0:
            errs.append(f"vessel {v.vessel_id} has no auxiliary load -- speeds will "
                        f"collapse to the lower bound")
        if v.vessel_id not in inst.vessel_fuels:
            errs.append(f"vessel {v.vessel_id} has no compatible fuel")
        if v.vessel_id not in inst.vessel_cargo:
            errs.append(f"vessel {v.vessel_id} has no compatible cargo")

    for p in inst.parcels.values():
        for code in (p.origin_port, p.dest_port):
            if code not in codes:
                errs.append(f"parcel {p.parcel_id} references unknown port {code}")
        if p.laycan_start > p.laycan_end:
            errs.append(f"parcel {p.parcel_id} has an inverted laycan")
        if p.delivery_deadline < p.laycan_start:
            errs.append(f"parcel {p.parcel_id} deadline precedes its laycan")
        if not inst.compatible_vessels(p):
            errs.append(f"parcel {p.parcel_id} has zero feasible vessels")

    for fid in {f for fl in inst.vessel_fuels.values() for f in fl}:
        if fid not in inst.fuels:
            errs.append(f"compatibility table references unknown fuel {fid}")

    if errs:
        raise InstanceError("instance failed validation:\n  - " + "\n  - ".join(errs))
