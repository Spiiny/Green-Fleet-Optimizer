"""Emissions and regulatory cost. Objective f2 and the ETS component of f1."""
from __future__ import annotations

from ..io.schema import Instance, Fuel, Vessel

EU_PORTS = {"ITGOA", "ESALG", "NLRTM"}


def co2_ttw(fuel: Fuel, tonnes: float) -> float:
    """Tank-to-wake tonnes CO2. This is what MRV and CII report."""
    return tonnes * fuel.co2_ttw_t_per_t


def co2e_wtw(fuel: Fuel, tonnes: float) -> float:
    """Well-to-wake tonnes CO2e. This is what FuelEU and honest comparisons use.

    LNG looks better on TTW than on WTW because of methane slip; methanol looks
    dramatically better on TTW than it deserves on WTW while it is fossil-derived.
    Report WTW as the headline or the comparison is unfair to conventional fuels.
    """
    return fuel.co2e_wtw_g_per_mj * fuel.energy_mj(tonnes) / 1e6


def ghg_intensity(fuels_burned: dict[str, float], inst: Instance) -> float:
    """Fleet GHG intensity in g CO2e per MJ -- the FuelEU compliance metric."""
    num = den = 0.0
    for fid, t in fuels_burned.items():
        f = inst.fuels[fid]
        mj = f.energy_mj(t)
        num += f.co2e_wtw_g_per_mj * mj
        den += mj
    return num / den if den > 0 else 0.0


def ets_scope(origin: str, dest: str) -> float:
    """EU ETS applies to 100% of intra-EU voyages and 50% of voyages with one
    EU leg. Non-EU voyages are out of scope."""
    a, b = origin in EU_PORTS, dest in EU_PORTS
    if a and b:
        return 1.0
    if a or b:
        return 0.5
    return 0.0


def ets_cost_usd(inst: Instance, fuel: Fuel, tonnes: float,
                 origin: str, dest: str) -> float:
    scope = ets_scope(origin, dest)
    if scope == 0.0:
        return 0.0
    return scope * co2_ttw(fuel, tonnes) * inst.param_f("eu_ets_price_usd_per_tco2")


def fueleu_penalty_usd(inst: Instance, fuels_burned: dict[str, float]) -> float:
    """Penalty for exceeding the FuelEU GHG-intensity target. Zero when compliant."""
    target = inst.param_f("fueleu_ghg_target_gco2e_per_mj", 85.69)
    actual = ghg_intensity(fuels_burned, inst)
    if actual <= target or not fuels_burned:
        return 0.0
    total_mj = sum(inst.fuels[f].energy_mj(t) for f, t in fuels_burned.items())
    # VLSFO-equivalent tonnage, per the FuelEU formula
    vlsfoe = total_mj / (41000.0)
    excess = (actual - target) / target
    penalty_eur = inst.param_f("fueleu_penalty_eur_per_tvlsfoe", 2400.0)
    return excess * vlsfoe * penalty_eur * inst.param_f("usd_per_eur", 1.08)


def eca_fuel_split(inst: Instance, vessel: Vessel, primary: Fuel,
                   eca_fraction: float) -> tuple[Fuel, float]:
    """Which compliant fuel to burn inside an ECA, and what share of the leg.

    If the vessel cannot switch at sea, the compliant fuel is burned for the
    WHOLE leg -- a real and expensive consequence of older engine rooms.
    """
    if eca_fraction <= 0.0 or primary.eca_compliant:
        return primary, 0.0
    options = [inst.fuels[f] for f in inst.vessel_fuels[vessel.vessel_id]
               if inst.fuels[f].eca_compliant]
    if not options:
        return primary, 0.0
    alt = min(options, key=lambda f: f.co2e_wtw_g_per_mj)
    share = 1.0 if not vessel.can_switch_fuel_at_sea else eca_fraction
    return alt, share


def cii_attained(fuel_tonnes: dict[str, float], inst: Instance,
                 cargo_t: float, distance_nm: float) -> float:
    """Attained CII in g CO2 per tonne-mile. Compare to the vessel's rating band."""
    if cargo_t <= 0 or distance_nm <= 0:
        return float("inf")
    g = sum(co2_ttw(inst.fuels[f], t) for f, t in fuel_tonnes.items()) * 1e6
    return g / (cargo_t * distance_nm)
