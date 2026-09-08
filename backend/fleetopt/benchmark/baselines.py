"""Business-as-usual schedule -- the number a judge actually remembers.

Every vessel at design speed, cheapest compatible fuel, greedy nearest-deadline
assignment. This is roughly how a scheduler without an optimizer would do it,
and it is the honest denominator for any "% fuel saved" claim.
"""
from __future__ import annotations

from ..io.schema import Instance
from ..master.option_gen import Option, group_by_parcel


def bau_schedule(inst: Instance, options: list[Option]) -> list[Option]:
    groups = group_by_parcel(options)
    order = sorted(groups, key=lambda pid: inst.parcels[pid].delivery_deadline)
    chosen: list[Option] = []
    busy: dict[str, list[Option]] = {}

    for pid in order:
        cands = groups[pid]
        # BAU heuristic: cheapest fuel, shortest route, ignore the trade-off
        cands = sorted(cands, key=lambda o: (o.fuel_price, len(o.route), -o.sol.total_days))
        for o in cands:
            g = busy.get(o.vessel_id, [])
            if any(o.start < b.end and b.start < o.end for b in g):
                continue
            chosen.append(o)
            busy.setdefault(o.vessel_id, []).append(o)
            break
    return chosen
