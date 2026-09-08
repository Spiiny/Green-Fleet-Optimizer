"""Routing over the leg graph, and turning a route into solver-ready conditions."""
from __future__ import annotations
import heapq
from datetime import datetime, timedelta

from ..io.schema import Instance, Vessel, Leg
from ..inner.speed_solve import LegCondition

ECA_FUELS = {"MGO", "LNG", "MEOH"}          # sulphur <= 0.10 % or none


def _dijkstra(inst: Instance, src: str, banned_edges: set) -> tuple[dict, dict]:
    dist = {src: 0.0}
    prev: dict[str, str] = {}
    pq = [(0.0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):
            continue
        for (a, b), lg in inst.legs.items():
            if a != u or (a, b) in banned_edges:
                continue
            nd = d + lg.distance_nm
            if nd < dist.get(b, float("inf")):
                dist[b], prev[b] = nd, u
                heapq.heappush(pq, (nd, b))
    return dist, prev


def _path(prev: dict, src: str, dst: str) -> list[str] | None:
    if src == dst:
        return [src]
    if dst not in prev:
        return None
    out = [dst]
    while out[-1] != src:
        out.append(prev[out[-1]])
        if len(out) > 60:
            return None
    return out[::-1]


_ROUTE_CACHE: dict = {}


def k_shortest_routes(inst: Instance, src: str, dst: str, k: int = 3) -> list[list[str]]:
    """Yen's algorithm, distance-weighted. Returns lists of port codes.

    k=3 is the spec default: shortest, plus two structurally different options
    (usually a Suez-vs-Cape style alternative or a different transhipment hub).
    """
    ck = (id(inst), src, dst, k)
    if ck in _ROUTE_CACHE:
        return _ROUTE_CACHE[ck]
    _, prev = _dijkstra(inst, src, set())
    first = _path(prev, src, dst)
    if first is None:
        _ROUTE_CACHE[ck] = []
        return []
    A, B = [first], []
    for _ in range(k - 1):
        for i in range(len(A[-1]) - 1):
            spur, root = A[-1][i], A[-1][:i + 1]
            banned = {(p[i], p[i + 1]) for p in A
                      if len(p) > i + 1 and p[:i + 1] == root}
            _, pv = _dijkstra(inst, spur, banned)
            tail = _path(pv, spur, dst)
            if tail is None:
                continue
            cand = root[:-1] + tail
            if cand not in A and cand not in B:
                B.append(cand)
        if not B:
            break
        B.sort(key=lambda p: route_distance(inst, p))
        A.append(B.pop(0))
    _ROUTE_CACHE[ck] = A
    return A


def route_distance(inst: Instance, route: list[str]) -> float:
    return sum(inst.leg(a, b).distance_nm for a, b in zip(route, route[1:]))


def route_legs(inst: Instance, route: list[str]) -> list[Leg]:
    return [inst.leg(a, b) for a, b in zip(route, route[1:])]


# --------------------------------------------------------------------------- #
def weather_at(inst: Instance, sea_area: str, when: datetime):
    """Nearest available forecast day for this sea area."""
    day = datetime(when.year, when.month, when.day)
    for delta in range(0, 61):
        for sign in (0, -1, 1):
            key = (sea_area, day + timedelta(days=sign * delta))
            if key in inst.weather:
                return inst.weather[key]
    raise KeyError(f"no weather for {sea_area}")


def build_conditions(inst: Instance, route: list[str], depart: datetime,
                     vessel: Vessel, sub_legs_per_leg: int = 3) -> list[LegCondition]:
    """Split each leg into sub-legs so weather can vary along it.

    The split is what lets the inner solver assign a different speed to a rough
    stretch than to a calm one -- the resolution a binned formulation destroys.
    """
    out: list[LegCondition] = []
    clock = depart
    for lg in route_legs(inst, route):
        # rough time estimate at design speed, to sample weather along the leg
        est_days = lg.distance_nm / (24.0 * vessel.design_speed_kn)
        for s in range(sub_legs_per_leg):
            mid = clock + timedelta(days=est_days * (s + 0.5) / sub_legs_per_leg)
            w = weather_at(inst, lg.sea_area, mid)
            out.append(LegCondition(
                distance_nm=lg.distance_nm / sub_legs_per_leg,
                resistance_multiplier=w.resistance_multiplier,
                current_kn=w.current_kn,
                speed_cap_kn=lg.max_speed_kn,
                label=f"{lg.leg_id}.{s + 1}"))
        clock += timedelta(days=est_days)
    return out


def eca_distance(inst: Instance, route: list[str]) -> float:
    return sum(lg.distance_nm * lg.eca_fraction for lg in route_legs(inst, route))


def canal_toll(inst: Instance, route: list[str], vessel: Vessel) -> float:
    return sum(lg.canal_toll_usd_per_gt * vessel.gross_tonnage
               for lg in route_legs(inst, route))


def convoy_delay_h(inst: Instance, route: list[str]) -> float:
    """One-way traffic means waiting for a slot. Suez convoys form twice daily."""
    return sum(12.0 for lg in route_legs(inst, route) if lg.one_way_traffic)
