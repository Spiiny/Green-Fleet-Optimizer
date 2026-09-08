"""M4a -- turn a priced option set into a QUBO.

    H(x) = sum_k  Chat_k * x_k                                  linear
         + A * sum_{p mandatory} ( sum_{k in p} x_k - 1 )^2     exactly one
         + A * sum_{p optional}  sum_{k<k' in p} x_k x_k'       at most one
         + A * sum_{conflicting k,k'} x_k x_k'                  no double-booking

Physical constraints are ABSENT by design: infeasible options never reached
this point (option_gen ran the repair decoder). The only penalties here are the
two structural rules a QUBO has no other way to express.
"""
from __future__ import annotations
import numpy as np

from .option_gen import Option, group_by_parcel, conflict_pairs


def normalise(values: np.ndarray) -> tuple[np.ndarray, float, float]:
    lo, hi = float(values.min()), float(values.max())
    span = hi - lo
    if span < 1e-12:
        return np.zeros_like(values), lo, hi
    return (values - lo) / span, lo, hi


def scalarise(options: list[Option], weights=(1.0, 0.0, 0.0),
              ideal=None, nadir=None) -> np.ndarray:
    """Weighted-sum scalarisation of (cost, CO2e, lateness), each normalised.

    Normalisation is not optional: cost is ~1e6 USD and lateness is ~1e1 days,
    so an unnormalised weighted sum is a cost-only objective wearing a costume.
    """
    f1 = np.array([o.net_usd for o in options], float)
    f2 = np.array([o.co2e_t for o in options], float)
    f3 = np.array([o.late_days for o in options], float)
    n1, n2, n3 = normalise(f1)[0], normalise(f2)[0], normalise(f3)[0]
    w1, w2, w3 = weights
    return w1 * n1 + w2 * n2 + w3 * n3


def build_qubo(options: list[Option], mandatory: dict[str, bool],
               weights=(1.0, 0.0, 0.0), penalty_scale: float = 1.5
               ) -> tuple[np.ndarray, float, dict]:
    """Returns (Q, penalty_weight_A, meta). Q is symmetric, n x n."""
    n = len(options)
    chat = scalarise(options, weights)

    # Penalty weight MUST be recomputed whenever the scalarisation changes.
    # A stale A is the classic silent failure: either constraints stop binding
    # or the cost signal is drowned out.
    A = penalty_scale * max(1.0, float(np.abs(chat).max()) * 4.0)

    Q = np.zeros((n, n), dtype=np.float64)
    np.fill_diagonal(Q, chat)

    groups = group_by_parcel(options)
    n_mand = 0
    for pid, opts in groups.items():
        idx = [o.idx for o in opts]
        if mandatory.get(pid, True):
            n_mand += 1
            # (sum x - 1)^2 = sum x_i^2 - 2 sum x_i + 2 sum_{i<j} x_i x_j + 1
            #               = -sum x_i + 2 sum_{i<j} x_i x_j   (+const, x^2 = x)
            for i in idx:
                Q[i, i] -= A
            for a in range(len(idx)):
                for b in range(a + 1, len(idx)):
                    Q[idx[a], idx[b]] += A
                    Q[idx[b], idx[a]] += A
        else:
            # at most one: penalise pairs only, and reward taking a good one
            # through its (negative) cost coefficient alone
            for a in range(len(idx)):
                for b in range(a + 1, len(idx)):
                    Q[idx[a], idx[b]] += A
                    Q[idx[b], idx[a]] += A

    pairs = conflict_pairs(options)
    for i, j in pairs:
        Q[i, j] += A
        Q[j, i] += A

    meta = dict(n=n, A=A, n_mandatory=n_mand, n_conflicts=len(pairs),
                weights=weights, density=float((Q != 0).mean()))
    return Q, A, meta


def qubo_energy(Q: np.ndarray, x: np.ndarray) -> float:
    return float(x @ Q @ x)


def decode(x: np.ndarray, options: list[Option]) -> list[Option]:
    return [options[i] for i in np.flatnonzero(x > 0.5)]


def check_feasible(chosen: list[Option], mandatory: dict[str, bool]
                   ) -> tuple[bool, list[str]]:
    """Structural feasibility of a decoded solution. Physical feasibility is
    already guaranteed by construction."""
    errs = []
    seen: dict[str, int] = {}
    for o in chosen:
        seen[o.parcel_id] = seen.get(o.parcel_id, 0) + 1
    for pid, k in seen.items():
        if k > 1:
            errs.append(f"{pid} served {k} times")
    for pid, is_m in mandatory.items():
        if is_m and seen.get(pid, 0) == 0:
            errs.append(f"mandatory parcel {pid} unserved")
    by_v: dict[str, list[Option]] = {}
    for o in chosen:
        by_v.setdefault(o.vessel_id, []).append(o)
    for vid, group in by_v.items():
        group.sort(key=lambda o: o.start)
        for a, b in zip(group, group[1:]):
            if b.start < a.end:
                errs.append(f"{vid} double-booked: {a.parcel_id} / {b.parcel_id}")
    return (not errs), errs


# --------------------------------------------------------------------------- #
def repair_solution(chosen: list[Option], options: list[Option],
                    mandatory: dict[str, bool]) -> list[Option]:
    """Make a decoded bit vector structurally legal.

    dSB optimises a penalised energy, so a small penalty violation can still look
    attractive to the dynamics. Rather than inflate A until the cost signal is
    drowned out, decode then repair -- the same philosophy as L0, applied to the
    two structural rules.

    1. one option per parcel (keep the cheapest)
    2. drop conflicting options on the same vessel (greedy by net cost)
    3. insert the cheapest non-conflicting option for any unserved mandatory parcel
    """
    by_parcel: dict[str, Option] = {}
    for o in sorted(chosen, key=lambda o: o.net_usd):
        by_parcel.setdefault(o.parcel_id, o)

    kept: list[Option] = []
    for o in sorted(by_parcel.values(), key=lambda o: o.net_usd):
        if not any(o.vessel_id == k.vessel_id and o.overlaps(k) for k in kept):
            kept.append(o)

    pool = group_by_parcel(options)

    def blockers(cand, plan):
        return [k for k in plan if cand.vessel_id == k.vessel_id and cand.overlaps(k)]

    # 3a. fill any unserved mandatory parcel into a free slot
    for pid, is_m in mandatory.items():
        if not is_m or pid in {o.parcel_id for o in kept}:
            continue
        for cand in sorted(pool.get(pid, []), key=lambda o: o.net_usd):
            if not blockers(cand, kept):
                kept.append(cand)
                break

    # 3b. still unserved? EVICT a blocking voyage if the swap is worth it.
    # A mandatory parcel left unserved costs its breach penalty, so displacing a
    # cheaper optional voyage is often the right call. Without this step the
    # repair gives up too early and every solution reads as infeasible.
    for pid, is_m in mandatory.items():
        if not is_m or pid in {o.parcel_id for o in kept}:
            continue
        breach = 14.0 * next(p.late_penalty_usd_per_day
                             for p in (o.parcel for o in pool[pid]))
        best_swap = None
        for cand in sorted(pool.get(pid, []), key=lambda o: o.net_usd):
            bl = blockers(cand, kept)
            if not bl or any(mandatory.get(b.parcel_id, True) for b in bl):
                continue
            # Change in objective from making the swap. Before: we keep the
            # blockers and pay the breach. After: we run cand instead.
            #   delta = cand.net - sum(blocker nets) - breach
            # Negative delta means the swap improves the objective.
            gain = cand.net_usd - sum(b.net_usd for b in bl) - breach
            if gain < 0 and (best_swap is None or gain < best_swap[0]):
                best_swap = (gain, cand, bl)
        if best_swap:
            _, cand, bl = best_swap
            kept = [k for k in kept if k not in bl] + [cand]

    # optional parcels are worth taking only if they turn a profit
    for pid, opts in pool.items():
        if mandatory.get(pid, True) or pid in {o.parcel_id for o in kept}:
            continue
        for cand in sorted(opts, key=lambda o: o.net_usd):
            if cand.net_usd >= 0:
                break
            if not any(cand.vessel_id == k.vessel_id and cand.overlaps(k) for k in kept):
                kept.append(cand)
                break
    return kept


def qubo_to_ising(Q: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """x in {0,1}, x_i = (1+s_i)/2, s in {-1,+1}.

        x'Qx = sum_{i<j} (Q_ij+Q_ji)/2 * s_i s_j
             + sum_i [ Q_ii/2 + (1/2) sum_{j!=i} Q_ij ] * s_i
             + const

    Returns (J, h, const) for the MINIMISATION form
        E(s) = sum_{i<j} J_ij s_i s_j + sum_i h_i s_i + const
    with J symmetric and zero-diagonal.
    """
    Qs = 0.5 * (Q + Q.T)
    d = np.diag(Qs).copy()
    off = Qs - np.diag(d)
    J = 0.5 * off                       # symmetric, coefficient of s_i s_j
    np.fill_diagonal(J, 0.0)
    h = 0.5 * d + 0.5 * off.sum(axis=1)
    const = 0.5 * d.sum() + 0.5 * off.sum() / 2.0
    return J, h, float(const)
