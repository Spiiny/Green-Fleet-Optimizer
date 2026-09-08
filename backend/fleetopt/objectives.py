"""The three objectives, evaluated on a decoded solution.

One evaluator, used for every method. Comparing an optimiser against a baseline
scored a different way is the easiest way to fool yourself, so there is exactly
one function here and everything calls it.
"""
from __future__ import annotations
from dataclasses import dataclass, field

from .io.schema import Instance
from .master.option_gen import Option
from .model.emissions import fueleu_penalty_usd, ghg_intensity

BREACH_DAYS = 14.0          # contractual exposure for abandoning a firm cargo


@dataclass
class Evaluation:
    f1_cost_usd: float          # minimise: total cost - revenue + forfeits
    f2_co2e_t: float            # minimise: well-to-wake
    f3_late_days: float         # minimise
    gross_cost: float
    revenue: float
    fuel_cost: float
    charter_cost: float
    port_cost: float
    reposition_cost: float
    late_penalty: float
    fueleu_penalty: float
    forfeit: float
    fuel_t: float
    ghg_intensity_g_per_mj: float
    n_served: int
    unserved: list = field(default_factory=list)

    @property
    def margin(self) -> float:
        return -self.f1_cost_usd

    def as_tuple(self):
        return (self.f1_cost_usd, self.f2_co2e_t, self.f3_late_days)


def evaluate(inst: Instance, chosen: list[Option],
             reposition_cost: float = 0.0, reposition_co2: float = 0.0,
             reposition_fuel_t: float = 0.0) -> Evaluation:
    fuel_by_id: dict[str, float] = {}
    gross = rev = fuel_cost = charter = late_pen = late = co2e = fuel_t = 0.0
    for o in chosen:
        fuel_by_id[o.fuel.fuel_id] = fuel_by_id.get(o.fuel.fuel_id, 0.0) + o.sol.fuel_t
        gross += o.cost_usd
        rev += o.revenue_usd
        fuel_cost += o.sol.fuel_cost_usd
        charter += o.sol.time_cost_usd
        late += o.late_days
        late_pen += o.late_days * o.parcel.late_penalty_usd_per_day
        co2e += o.co2e_t
        fuel_t += o.sol.fuel_t
    port = gross - fuel_cost - charter - late_pen

    served = {o.parcel_id for o in chosen}
    unserved = [p.parcel_id for p in inst.parcels.values() if p.parcel_id not in served]
    forfeit = sum(inst.parcels[u].late_penalty_usd_per_day * BREACH_DAYS
                  for u in unserved if inst.parcels[u].mandatory)

    feu = fueleu_penalty_usd(inst, fuel_by_id)
    f1 = gross + reposition_cost + feu + forfeit - rev
    return Evaluation(
        f1_cost_usd=f1, f2_co2e_t=co2e + reposition_co2, f3_late_days=late,
        gross_cost=gross + reposition_cost, revenue=rev, fuel_cost=fuel_cost,
        charter_cost=charter, port_cost=port, reposition_cost=reposition_cost,
        late_penalty=late_pen, fueleu_penalty=feu, forfeit=forfeit,
        fuel_t=fuel_t + reposition_fuel_t,
        ghg_intensity_g_per_mj=ghg_intensity(fuel_by_id, inst),
        n_served=len(served), unserved=unserved)
