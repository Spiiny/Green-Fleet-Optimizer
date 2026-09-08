import math
from datetime import timedelta
import numpy as np

from fleetopt.io.loader import load_instance
from fleetopt.model import network as N
from fleetopt.model import ports as P
from fleetopt.repair.decoder import repair

INST = load_instance("data")
RNG = np.random.default_rng(11)


def all_options(limit=None):
    out = []
    for p in INST.parcels.values():
        for v in INST.compatible_vessels(p):
            for rt in N.k_shortest_routes(INST, p.origin_port, p.dest_port, k=3):
                for f in INST.compatible_fuels(v):
                    out.append((p, v, rt, f))
                    if limit and len(out) >= limit:
                        return out
    return out


def test_every_parcel_has_a_feasible_option():
    for p in INST.parcels.values():
        ok = any(repair(INST, p, v, rt, f)
                 for v in INST.compatible_vessels(p)
                 for rt in N.k_shortest_routes(INST, p.origin_port, p.dest_port, k=3)
                 for f in INST.compatible_fuels(v))
        assert ok, f"{p.parcel_id} has no feasible option"


def test_accepted_plans_are_actually_legal():
    """Fuzz every option; anything the decoder accepts must satisfy every rule."""
    n = 0
    for (p, v, rt, f) in all_options():
        r = repair(INST, p, v, rt, f)
        if not r:
            continue
        n += 1
        assert r.sailing_budget_days > 0
        assert v.min_load_factor - 1e-9 <= r.load_factor <= v.max_load_factor + 1e-9
        draft = v.draft_at(r.load_factor)
        for c in (p.origin_port, p.dest_port):
            cap = (min(INST.ports[c].max_draft_m, P.deepest_window_draft(INST, c))
                   if INST.ports[c].tidal_restricted else INST.ports[c].max_draft_m)
            assert draft <= cap + 1e-6, f"{p.parcel_id}/{v.vessel_id} too deep for {c}"
        assert r.depart_origin <= p.laycan_end
        assert f.fuel_id in INST.vessel_fuels[v.vessel_id]
        assert p.cargo_type in INST.vessel_cargo[v.vessel_id]
        min_days = sum(lg.distance_nm / (24 * min(v.max_speed_kn, lg.max_speed_kn))
                       for lg in N.route_legs(INST, rt))
        assert min_days <= r.sailing_budget_days + 1e-9
    assert n > 200, f"only {n} feasible options -- filter is too tight"


def test_tidal_port_entry_is_gated():
    """Haldia is the binding case: only a shallow ship, only near high water."""
    p = INST.parcels["C17"]           # INPRT -> INHAL
    hits = 0
    for v in INST.compatible_vessels(p):
        for f in INST.compatible_fuels(v):
            r = repair(INST, p, v, [p.origin_port, p.dest_port], f)
            if r:
                hits += 1
                assert v.draft_at(r.load_factor) <= P.deepest_window_draft(INST, "INHAL") + 1e-6
    assert hits > 0


def test_eca_forces_a_compliant_fuel():
    p = INST.parcels["C09"]           # INMUN -> NLRTM, crosses the Med + North Sea
    v = INST.vessels["V09"]
    rt = N.k_shortest_routes(INST, p.origin_port, p.dest_port, k=1)[0]
    assert N.eca_distance(INST, rt) > 0
    r = repair(INST, p, v, rt, INST.fuels["VLSFO"])
    assert r and r.eca_fuel is not None and r.eca_fuel.eca_compliant
    assert r.eca_share > 0


def test_drydock_blocks_the_vessel():
    v = INST.vessels["V05"]
    assert v.drydock_from is not None
    assert v.is_in_drydock(v.drydock_from + timedelta(days=3))
    assert not v.is_in_drydock(v.drydock_from - timedelta(days=3))
