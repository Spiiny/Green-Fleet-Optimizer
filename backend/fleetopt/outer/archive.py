"""Non-dominated archive plus the crowding measure AWA needs."""
from __future__ import annotations
import numpy as np


def dominates(a, b, eps: float = 1e-9) -> bool:
    a, b = np.asarray(a, float), np.asarray(b, float)
    return bool(np.all(a <= b + eps) and np.any(a < b - eps))


def non_dominated(points: np.ndarray) -> np.ndarray:
    """Boolean mask of the non-dominated rows (all objectives minimised)."""
    n = len(points)
    keep = np.ones(n, bool)
    order = np.argsort(points[:, 0], kind="stable")
    for i in order:
        if not keep[i]:
            continue
        for j in order:
            if i != j and keep[j] and dominates(points[j], points[i]):
                keep[i] = False
                break
    return keep


class Archive:
    def __init__(self, cap: int = 300):
        self.plans: list = []
        self.cap = cap

    def add(self, plan) -> bool:
        f = np.asarray(plan.objectives, float)
        for p in self.plans:
            if dominates(np.asarray(p.objectives, float), f):
                return False
        self.plans = [p for p in self.plans
                      if not dominates(f, np.asarray(p.objectives, float))]
        # skip near-duplicates so the archive stays informative
        for p in self.plans:
            if np.allclose(p.objectives, f, rtol=1e-6, atol=1e-6):
                return False
        self.plans.append(plan)
        if len(self.plans) > self.cap:
            self._prune()
        return True

    @property
    def F(self) -> np.ndarray:
        if not self.plans:
            return np.zeros((0, 3))
        return np.array([p.objectives for p in self.plans], float)

    def _prune(self):
        cd = crowding_distance(self.F)
        keep = np.argsort(-cd)[:self.cap]
        self.plans = [self.plans[i] for i in sorted(keep)]

    def sparse_points(self, k: int) -> np.ndarray:
        """The k least-crowded objective vectors -- where AWA should add weight."""
        F = self.F
        if len(F) == 0:
            return np.zeros((0, 3))
        cd = crowding_distance(F)
        return F[np.argsort(-cd)[:k]]


def crowding_distance(F: np.ndarray) -> np.ndarray:
    """NSGA-II crowding distance on normalised objectives."""
    n, m = F.shape
    if n <= 2:
        return np.full(n, np.inf)
    lo, hi = F.min(0), F.max(0)
    span = np.where(hi - lo < 1e-12, 1.0, hi - lo)
    Z = (F - lo) / span
    d = np.zeros(n)
    for j in range(m):
        order = np.argsort(Z[:, j])
        d[order[0]] = d[order[-1]] = np.inf
        prev, nxt = Z[order[:-2], j], Z[order[2:], j]
        d[order[1:-1]] += nxt - prev
    return d
