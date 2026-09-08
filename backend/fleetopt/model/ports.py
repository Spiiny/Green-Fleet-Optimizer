"""Everything that consumes time at a port: tide gating, queueing, cargo work."""
from __future__ import annotations
import math
from datetime import datetime, timedelta

import numpy as np

from ..io.schema import Instance, Port, Vessel, Parcel


# --------------------------------------------------------------------------- #
# Tide
# --------------------------------------------------------------------------- #
def next_tide_window(inst: Instance, port_code: str, earliest: datetime,
                     required_draft_m: float):
    """First window at or after `earliest` deep enough for this draft.

    Returns (entry_time, window) or (None, None) if no window in the horizon
    ever fits -- meaning the vessel must part-load or go elsewhere.
    """
    for w in inst.tides.get(port_code, []):
        if w.window_end < earliest:
            continue
        if w.max_sailing_draft_m + 1e-9 >= required_draft_m:
            return max(earliest, w.window_start), w
    return None, None


def deepest_window_draft(inst: Instance, port_code: str) -> float:
    """Best draft this port ever offers -- the hard ceiling for the whole horizon."""
    ws = inst.tides.get(port_code, [])
    if not ws:
        return inst.ports[port_code].max_draft_m
    return max(w.max_sailing_draft_m for w in ws)


def available_draft(inst: Instance, port_code: str, when: datetime) -> float:
    """Usable draft at a given instant: tide-gated ports vary, others are static."""
    p = inst.ports[port_code]
    if not p.tidal_restricted:
        return p.max_draft_m
    for w in inst.tides.get(port_code, []):
        if w.window_start <= when <= w.window_end:
            return min(p.max_draft_m, w.max_sailing_draft_m)
    return 0.0                      # outside a window a tidal port is shut


# --------------------------------------------------------------------------- #
# Congestion
# --------------------------------------------------------------------------- #
def waiting_hours(inst: Instance, port_code: str, when: datetime,
                  rng: np.random.Generator | None = None,
                  quantile: float | None = None) -> float:
    """Predicted queueing time before a berth frees up.

    Pass `quantile` for a deterministic draw (0.5 = median, 0.9 = p90) or `rng`
    for a stochastic one. Deterministic is right for the cost table; stochastic
    is right for scenario evaluation.
    """
    c = inst.congestion.get((port_code, when.month))
    if c is None:
        c = min((x for (p, _), x in inst.congestion.items() if p == port_code),
                key=lambda x: x.month, default=None)
    if c is None:
        return 0.0
    if quantile is not None:
        from scipy.stats import norm
        return float(math.exp(c.lognormal_mu + c.lognormal_sigma * norm.ppf(quantile)))
    if rng is None:
        return c.p50_wait_h
    return float(rng.lognormal(c.lognormal_mu, c.lognormal_sigma))


# --------------------------------------------------------------------------- #
# Cargo handling
# --------------------------------------------------------------------------- #
def handling_hours(inst: Instance, port_code: str, parcel: Parcel,
                   load_factor: float = 1.0) -> float:
    """Berth-to-unberth time for moving this parcel."""
    h = inst.handling.get((port_code, parcel.cargo_type))
    if h is None:
        return math.inf                     # this port cannot handle this cargo
    qty = parcel.quantity * load_factor
    return h.fixed_berthing_h + qty / h.handling_rate_per_h + h.fixed_departure_h


def can_handle(inst: Instance, port_code: str, cargo_type: str) -> bool:
    return (port_code, cargo_type) in inst.handling


def opening_delay_h(port: Port, arrival: datetime) -> float:
    """Ports that are not 24h only work a window each day. A ship arriving after
    close waits for the morning."""
    if port.is_24h:
        return 0.0
    open_h, close_h = 6.0, 6.0 + port.operating_hours_per_day
    t = arrival.hour + arrival.minute / 60.0
    if t < open_h:
        return open_h - t
    if t >= close_h:
        return 24.0 - t + open_h
    return 0.0


def port_call_cost(port: Port, vessel: Vessel) -> float:
    return port.port_dues_usd_per_gt * vessel.gross_tonnage + port.pilotage_tug_usd
