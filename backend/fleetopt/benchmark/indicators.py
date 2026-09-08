"""Pareto-front quality indicators, with the direction of goodness attached.

    GD       generational distance          LOWER is better   (convergence only)
    IGD      inverted generational distance LOWER is better   (convergence + diversity)
    IGD+     Pareto-compliant IGD           LOWER is better   (preferred over IGD)
    HV       hypervolume                    HIGHER is better  (both; needs a ref point)
    Spacing  uniformity of gaps             LOWER is better   (distribution only)
    Spread   Delta, Deb's diversity metric  LOWER is better   (distribution + extent)

Which to trust when they disagree:

* GD measures ONLY how close your points are to the true front. A front that
  collapsed to a single perfect point scores GD = 0. Never report GD alone.
* IGD measures how well you COVER the true front, so it catches that failure --
  but it is not Pareto compliant: a dominating set can score worse than a
  dominated one. IGD+ fixes that and is the modern default.
* HV is Pareto compliant and needs no true front, which is why it is the only
  usable indicator on the maritime problem. It depends entirely on the reference
  point, which MUST be shared across every method being compared.
* Spacing measures gap uniformity but ignores extent: a tight, evenly spaced
  cluster in one corner scores well. Spread (Delta) adds the extremes and fixes
  that, so prefer Spread when reporting distribution.
"""
from __future__ import annotations
import numpy as np

from ..outer.archive import non_dominated

DIRECTION = {"gd": "lower", "igd": "lower", "igd_plus": "lower",
             "hypervolume": "higher", "spacing": "lower", "spread": "lower"}
ARROW = {"lower": "v", "higher": "^"}
LABEL = {"gd": "GD", "igd": "IGD", "igd_plus": "IGD+", "hypervolume": "HV",
         "spacing": "Spacing", "spread": "Spread"}


def header(name: str) -> str:
    """'igd_plus' -> 'IGD+ v'  so every table states its own direction."""
    return f"{LABEL.get(name, name)} {ARROW[DIRECTION[name]]}"


def normalise(F, lo=None, hi=None):
    lo = F.min(0) if lo is None else lo
    hi = F.max(0) if hi is None else hi
    span = np.where(hi - lo < 1e-12, 1.0, hi - lo)
    return (F - lo) / span, lo, hi


def _pair(A, B):
    return np.linalg.norm(A[:, None, :] - B[None, :, :], axis=2)


def _prep(F, R, do_norm=True):
    F = np.atleast_2d(np.asarray(F, float))
    R = np.atleast_2d(np.asarray(R, float))
    if len(F) == 0 or len(R) == 0:
        return None, None
    if do_norm:
        lo, hi = R.min(0), R.max(0)
        span = np.where(hi - lo < 1e-12, 1.0, hi - lo)
        F, R = (F - lo) / span, (R - lo) / span
    return F, R


# --------------------------------------------------------------------------- #
def gd(F, reference, p: int = 2) -> float:
    """Generational distance. LOWER is better.

    Mean distance from each OBTAINED point to its nearest true-front point.
    Pure convergence: says nothing about coverage, so a single well-converged
    point scores perfectly. Never report it alone.
    """
    F, R = _prep(F, reference)
    if F is None:
        return float("inf")
    d = _pair(F, R).min(axis=1)
    return float((np.sum(d ** p) ** (1.0 / p)) / len(F))


def igd(F, reference) -> float:
    """Inverted generational distance. LOWER is better.

    Mean distance from each TRUE-front point to its nearest obtained point, so
    gaps in coverage are penalised. Not Pareto compliant -- prefer IGD+.
    """
    F, R = _prep(F, reference)
    if F is None:
        return float("inf")
    return float(_pair(R, F).min(axis=1).mean())


def igd_plus(F, reference) -> float:
    """Pareto-compliant IGD. LOWER is better.

    Distance counts only components where the obtained point is WORSE than the
    reference point, so a dominating set can never score worse than a dominated
    one.
    """
    F, R = _prep(F, reference)
    if F is None:
        return float("inf")
    d = np.sqrt((np.maximum(F[None, :, :] - R[:, None, :], 0.0) ** 2).sum(2))
    return float(d.min(axis=1).mean())


def hypervolume(F, ref=None, ideal=None, samples: int = 200_000,
                seed: int = 0) -> float:
    """Fraction of the box [ideal, ref] dominated by the front. HIGHER is better.

    `ideal` and `ref` MUST be shared across every method compared. Derived
    per-method they are meaningless: a single point scores 1.0 against its own
    degenerate box, which is how a one-shot solver appears to beat a real front.

    Monte Carlo; at 200k seeded samples the estimate is stable to ~0.1%, well
    inside 31-seed noise. Report the sample count.
    """
    F = np.atleast_2d(np.asarray(F, float))
    if len(F) == 0:
        return 0.0
    F = F[non_dominated(F)]
    lo = F.min(0) if ideal is None else np.asarray(ideal, float)
    ref = (F.max(0) + np.abs(F.max(0)) * 0.1 + 1e-9) if ref is None \
        else np.asarray(ref, float)
    box = ref - lo
    if np.any(box <= 0):
        return 0.0
    rng = np.random.default_rng(seed)
    P = lo + rng.random((samples, F.shape[1])) * box
    covered = np.zeros(samples, bool)
    for f in F:
        covered |= np.all(f <= P, axis=1)
    return float(covered.mean())


def spacing(F) -> float:
    """Std-dev of nearest-neighbour distances. LOWER is better.

    Uniformity of the gaps ONLY. A tight, evenly spaced cluster in one corner
    scores excellently -- which is exactly why Spread exists.
    """
    F = np.atleast_2d(np.asarray(F, float))
    if len(F) < 3:
        return 0.0
    Fn, _, _ = normalise(F)
    D = _pair(Fn, Fn)
    np.fill_diagonal(D, np.inf)
    d = D.min(1)
    return float(np.sqrt(((d - d.mean()) ** 2).mean()))


def spread(F, reference=None) -> float:
    """Generalised spread (Delta). LOWER is better.

        Delta = ( sum_e d_e + sum_i |d_i - dbar| ) / ( sum_e d_e + |F|*dbar )

    d_e is the distance from each extreme point of the true front to its nearest
    obtained point. Unlike Spacing this penalises a front that fails to reach
    the extremes, so it captures extent as well as uniformity. Delta = 0 is a
    perfectly uniform front spanning the full extremes. Any objective count.
    """
    F = np.atleast_2d(np.asarray(F, float))
    if len(F) < 2:
        return float("inf")
    if reference is not None:
        R = np.atleast_2d(np.asarray(reference, float))
        lo, hi = R.min(0), R.max(0)
    else:
        R, lo, hi = F, F.min(0), F.max(0)
    span = np.where(hi - lo < 1e-12, 1.0, hi - lo)
    Fn, Rn = (F - lo) / span, (R - lo) / span

    D = _pair(Fn, Fn)
    np.fill_diagonal(D, np.inf)
    d = D.min(1)
    dbar = d.mean()
    extremes = np.array([Rn[np.argmin(Rn[:, m])] for m in range(Rn.shape[1])])
    d_e = _pair(extremes, Fn).min(axis=1).sum()
    num = d_e + np.abs(d - dbar).sum()
    den = d_e + len(Fn) * dbar
    return float(num / den) if den > 1e-12 else float("inf")


# --------------------------------------------------------------------------- #
def summary(F, reference=None, ideal=None, ref=None) -> dict:
    """Every indicator at once. Keys match DIRECTION for arrow rendering."""
    F = np.atleast_2d(np.asarray(F, float))
    nd = F[non_dominated(F)] if len(F) else F
    out = dict(n_points=len(F), n_nondominated=len(nd),
               hypervolume=hypervolume(F, ref=ref, ideal=ideal),
               spacing=spacing(nd), spread=spread(nd, reference))
    if reference is not None:
        out["gd"] = gd(nd, reference)
        out["igd"] = igd(nd, reference)
        out["igd_plus"] = igd_plus(nd, reference)
    return out
