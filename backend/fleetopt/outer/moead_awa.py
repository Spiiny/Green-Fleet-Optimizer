"""L3 -- MOEA/D-AWA over (cost, CO2e, lateness).

Phase A seeds one subproblem per weight vector by building a scalarised QUBO and
solving it with dSB. That alone produces a usable Pareto front.

Phase B evolves. Each subproblem holds a Plan = (discrete assignment, speed
policy). The QPSO operator varies the continuous block every generation; dSB
re-solves the discrete block only when a subproblem stagnates or AWA moves its
weight vector, which keeps the expensive call to a small fraction of evaluations.

Adaptive weight adjustment matters here because the front is not smooth. Fuel-type
switches and CII band edges put cliffs in it, and fixed Das-Dennis weights pile
subproblems onto the cliff edge while leaving other regions unexplored.
"""
from __future__ import annotations
from dataclasses import dataclass
import time
import numpy as np

from ..io.schema import Instance
from ..master.option_gen import Option
from ..master.qubo import build_qubo, decode, repair_solution
from ..master.dsb import solve_qubo
from .plan import Plan, make_plan, realise
from .archive import Archive, crowding_distance, non_dominated
from . import qpso


# --------------------------------------------------------------------------- #
def das_dennis(p: int, m: int = 3) -> np.ndarray:
    """Uniform weight vectors on the m-simplex with p divisions."""
    def rec(left, depth):
        if depth == m - 1:
            return [[left]]
        out = []
        for i in range(left + 1):
            for tail in rec(left - i, depth + 1):
                out.append([i] + tail)
        return out
    W = np.array(rec(p, 0), float) / p
    return np.clip(W, 1e-6, None)


def tchebycheff(f: np.ndarray, w: np.ndarray, z_ideal: np.ndarray,
                z_nadir: np.ndarray) -> float:
    """Normalised Tchebycheff. The normalisation is not decorative: f1 is ~1e7
    USD and f3 is ~1e0 days, so an unnormalised version is a cost-only objective."""
    span = np.where(z_nadir - z_ideal < 1e-12, 1.0, z_nadir - z_ideal)
    return float(np.max(w * np.abs(f - z_ideal) / span))


# --------------------------------------------------------------------------- #
@dataclass
class MOEADResult:
    archive: Archive
    history: list          # (seconds, hypervolume-proxy, archive size)
    n_dsb_calls: int
    n_evals: int
    seconds: float
    weights: np.ndarray


def run(inst: Instance, options: list[Option], mandatory: dict[str, bool],
        n_weights: int = 66, generations: int = 30, neighbourhood: int = 12,
        awa_every: int = 10, awa_frac: float = 0.10, seed: int = 0,
        dsb_agents: int = 48, dsb_steps: int = 1200,
        stagnation: int = 4, verbose: bool = True,
        max_seconds: float | None = None) -> MOEADResult:

    rng = np.random.default_rng(seed)
    t0 = time.perf_counter()
    W = das_dennis({36: 7, 66: 10, 105: 13}.get(n_weights, 10))[:n_weights]
    N = len(W)
    archive = Archive(cap=400)
    history: list = []
    n_dsb = n_eval = 0

    # ---------------- Phase A: one dSB solve per weight vector ------------- #
    pop: list[Plan] = []
    for j, w in enumerate(W):
        Q, A, _ = build_qubo(options, mandatory, weights=tuple(w))
        res = solve_qubo(Q, agents=dsb_agents, steps=dsb_steps, seed=seed + j)
        n_dsb += 1
        chosen = repair_solution(decode(res.x, options), options, mandatory)
        # CO2-weighted subproblems start slower; cost-weighted start at the
        # commercial optimum. A sensible prior beats a random one.
        beta0 = float(np.clip(w[1] * 1.2, 0.0, 1.0))
        pl = make_plan(inst, options, chosen, beta0)
        n_eval += 1
        pop.append(pl)
        archive.add(pl)
        if verbose and (j + 1) % 10 == 0:
            print(f"    phase A {j+1}/{N}  archive {len(archive.plans)}")
        if max_seconds and time.perf_counter() - t0 > max_seconds * 0.6:
            # never spend more than 60% of the budget seeding -- the outer loop
            # needs room to actually evolve
            W, pop = W[:j + 1], pop[:j + 1]
            break
    history.append((time.perf_counter() - t0, _spread(archive), len(archive.plans)))

    N = len(pop)
    F = np.array([p.objectives for p in pop], float)
    z_ideal, z_nadir = F.min(0), F.max(0)
    B = _neighbours(W, min(neighbourhood, N))
    pbest = [p.copy() for p in pop]
    pbest_f = F.copy()
    stale = np.zeros(N, int)

    # ---------------- Phase B: evolve --------------------------------------- #
    for gen in range(generations):
        beta_c = qpso.contraction(gen, generations)
        gidx = int(np.argmin([tchebycheff(pbest_f[j], W[j], z_ideal, z_nadir)
                              for j in range(N)]))

        for j in rng.permutation(N):
            cur = pop[j]
            nb = B[j][rng.integers(len(B[j]))]
            L = len(cur.beta)
            if L == 0:
                continue
            mb = np.mean([np.resize(pbest[k].beta, L) for k in B[j][:4]], axis=0)
            child = cur.copy()
            child.beta = qpso.sample(cur.beta, np.resize(pbest[j].beta, L),
                                     np.resize(pop[nb].beta, L), mb, beta_c, rng)

            # re-solve the discrete block only when this subproblem is stuck
            if stale[j] >= stagnation:
                Q, _, _ = build_qubo(options, mandatory, weights=tuple(W[j]))
                res = solve_qubo(Q, agents=dsb_agents, steps=dsb_steps,
                                 seed=int(rng.integers(1 << 30)))
                n_dsb += 1
                ch = repair_solution(decode(res.x, options), options, mandatory)
                child = make_plan(inst, options, ch, np.resize(child.beta, len(ch)))
                stale[j] = 0
            else:
                child = realise(inst, options, child)
            n_eval += 1

            f = np.asarray(child.objectives, float)
            z_ideal = np.minimum(z_ideal, f)
            z_nadir = np.maximum(z_nadir, f)
            archive.add(child)

            improved = False
            for k in B[j]:
                if tchebycheff(f, W[k], z_ideal, z_nadir) < \
                   tchebycheff(np.asarray(pop[k].objectives, float), W[k],
                               z_ideal, z_nadir):
                    pop[k] = child
                    improved = True
            if tchebycheff(f, W[j], z_ideal, z_nadir) < \
               tchebycheff(pbest_f[j], W[j], z_ideal, z_nadir):
                pbest[j], pbest_f[j] = child.copy(), f
            stale[j] = 0 if improved else stale[j] + 1

        if (gen + 1) % awa_every == 0 and len(archive.plans) > 6:
            W, B, moved = _awa(W, archive, min(neighbourhood, N), awa_frac, rng)
            stale[moved] = stagnation          # force a discrete re-solve there

        history.append((time.perf_counter() - t0, _spread(archive),
                        len(archive.plans)))
        if max_seconds and time.perf_counter() - t0 > max_seconds:
            break
        if verbose:
            print(f"    gen {gen+1:3d}/{generations}  archive {len(archive.plans):3d}  "
                  f"dSB calls {n_dsb}")

    return MOEADResult(archive, history, n_dsb, n_eval,
                       time.perf_counter() - t0, W)


# --------------------------------------------------------------------------- #
def _neighbours(W: np.ndarray, T: int) -> list[np.ndarray]:
    D = np.linalg.norm(W[:, None, :] - W[None, :, :], axis=2)
    return [np.argsort(D[j])[:T] for j in range(len(W))]


def _awa(W, archive, T, frac, rng):
    """Delete the most crowded subproblems; add weights at sparse archive regions."""
    n = len(W)
    k = max(1, int(frac * n))
    F = archive.F
    if len(F) < k + 2:
        return W, _neighbours(W, T), np.arange(0)
    cd = crowding_distance(W)                     # crowding in WEIGHT space
    drop = np.argsort(cd)[:k]
    sparse = archive.sparse_points(k)
    lo, hi = F.min(0), F.max(0)
    span = np.where(hi - lo < 1e-12, 1.0, hi - lo)
    newW = W.copy()
    for i, d in enumerate(drop):
        z = (sparse[i % len(sparse)] - lo) / span   # position on the front
        inv = 1.0 / np.clip(z, 1e-3, None)          # Tchebycheff weight for it
        newW[d] = np.clip(inv / inv.sum(), 1e-6, None)
    return newW, _neighbours(newW, T), drop


def _spread(archive: Archive) -> float:
    """Cheap front-quality proxy for the anytime curve (real HV is in benchmark)."""
    F = archive.F
    if len(F) < 2:
        return 0.0
    lo, hi = F.min(0), F.max(0)
    span = np.where(hi - lo < 1e-12, 1.0, hi - lo)
    Z = (F - lo) / span
    return float(len(F) * np.prod(1.0 + np.ptp(Z, axis=0)))
