"""M4b -- discrete Simulated Bifurcation (dSB).

A classical, deterministic simulation of a network of coupled nonlinear
oscillators. Each binary decision is a "ball" free to roll left (0) or right (1),
coupled to every other ball by springs whose stiffness encodes the cost. A
pumping parameter is ramped up; at a critical point the single potential well
BIFURCATES into two and every ball is forced to commit to one side. Because they
are all coupled, they commit together into a low-energy pattern.

Every ball updates from a simple matrix-vector product, so all N of them advance
simultaneously -- that is what makes it fast, and why a GPU helps.

    y += [ -(a0 - a(t)) x  -  c0 (J sign(x) + h) ] dt
    x += a0 y dt
    |x| > 1  ->  x = sign(x), y = 0          (inelastic walls)

"Discrete" SB uses sign(x) in the coupling term rather than x itself. That
suppresses the analog error that degrades ballistic SB on large instances.

Reference behaviour: dSB reaches the lowest time-to-target among SB variants and
outperforms quantum annealing hardware on dense benchmark graphs. This numpy
implementation is CPU-only and dependency-free; swap in the `simulated-
bifurcation` package (PyTorch/CUDA) via `solve_qubo(..., backend="torch")` for
GPU when you have one.
"""
from __future__ import annotations
from dataclasses import dataclass
import time
import numpy as np

from .qubo import qubo_to_ising, qubo_energy


@dataclass
class SBResult:
    x: np.ndarray                # best binary vector found
    energy: float                # QUBO energy of x
    seconds: float
    n_agents: int
    n_steps: int
    history: list[tuple[float, float]]   # (seconds, best energy so far)
    mode: str


# --------------------------------------------------------------------------- #
def _sb_core(J, h, agents, steps, dt, a0, c0, mode, rng, energy_fn,
             track_every, t_start, history):
    n = J.shape[0]
    X = rng.uniform(-0.1, 0.1, size=(agents, n)).astype(np.float32)
    Y = rng.uniform(-0.1, 0.1, size=(agents, n)).astype(np.float32)
    J = np.ascontiguousarray(J, dtype=np.float32)
    h = np.ascontiguousarray(h, dtype=np.float32)
    best_e, best_x = np.inf, None

    for step in range(steps):
        a = a0 * (step + 1) / steps                       # pumping ramp
        S = np.sign(X) if mode == "discrete" else X
        if mode == "discrete":
            np.copyto(S, 1.0, where=(S == 0.0))
        force = S @ J + h                                 # dE/ds  (J symmetric)
        Y += (-(a0 - a) * X - c0 * force) * np.float32(dt)
        X += np.float32(a0 * dt) * Y
        wall = np.abs(X) > 1.0
        if wall.any():
            X[wall] = np.sign(X[wall])
            Y[wall] = 0.0

        if (step + 1) % track_every == 0 or step == steps - 1:
            xb = (X > 0).astype(np.float64)
            es = energy_fn(xb)
            k = int(np.argmin(es))
            if es[k] < best_e:
                best_e, best_x = float(es[k]), xb[k].copy()
            history.append((time.perf_counter() - t_start, best_e))
    return best_x, best_e


def _local_search(Q: np.ndarray, x: np.ndarray, max_passes: int = 12) -> np.ndarray:
    """Single-bit-flip descent. Cheap, and it reliably recovers the last few
    percent that the continuous dynamics leaves on the table."""
    x = x.astype(np.float64).copy()
    Qs = np.ascontiguousarray(0.5 * (Q + Q.T), dtype=np.float32)
    d = np.diag(Qs).astype(np.float64)
    field = (Qs @ x.astype(np.float32)).astype(np.float64)   # sum_j Qs_ij x_j
    for _ in range(max_passes * 40):
        lin = d + 2.0 * (field - d * x)
        delta = (1.0 - 2.0 * x) * lin
        i = int(np.argmin(delta))
        if delta[i] >= -1e-9:
            break
        step = 1.0 - 2.0 * x[i]
        x[i] = 1.0 - x[i]
        field += step * Qs[:, i]                            # rank-1 update
    return x


def solve_qubo(Q: np.ndarray, agents: int = 48, steps: int = 1500,
               dt: float = 0.5, mode: str = "discrete", seed: int = 0,
               polish: bool = True, track_every: int = 250,
               backend: str = "numpy") -> SBResult:
    """Minimise x'Qx over x in {0,1}^n."""
    if backend == "torch":
        return _solve_torch(Q, agents, steps, dt, mode, seed, polish)

    t0 = time.perf_counter()
    n = Q.shape[0]
    J, h, _ = qubo_to_ising(Q)

    # Standard SB scaling: put the coupling term on the same footing as the
    # detuning term regardless of problem size or coefficient magnitude.
    scale = float(np.sqrt((J ** 2).sum() / max(n * (n - 1), 1)))
    if scale <= 0:
        scale = 1.0
    c0 = 0.5 / (scale * np.sqrt(n))
    a0 = 1.0
    hs = h / (scale * np.sqrt(n)) if scale > 0 else h

    rng = np.random.default_rng(seed)
    history: list[tuple[float, float]] = []
    Q32 = np.ascontiguousarray(Q, dtype=np.float32)
    energy_fn = lambda XB: ((XB.astype(np.float32) @ Q32) * XB.astype(np.float32)).sum(1)

    best_x, best_e = _sb_core(J / scale, hs, agents, steps, dt, a0, c0, mode,
                              rng, energy_fn, track_every, t0, history)

    if polish:
        px = _local_search(Q, best_x)
        pe = qubo_energy(Q, px)
        if pe < best_e:
            best_x, best_e = px, pe
            history.append((time.perf_counter() - t0, best_e))

    return SBResult(x=best_x, energy=best_e, seconds=time.perf_counter() - t0,
                    n_agents=agents, n_steps=steps, history=history, mode=mode)


def _solve_torch(Q, agents, steps, dt, mode, seed, polish) -> SBResult:
    """GPU path via the `simulated-bifurcation` package, if installed."""
    t0 = time.perf_counter()
    try:
        import torch
        import simulated_bifurcation as sb
    except ImportError as e:
        raise ImportError("backend='torch' needs `pip install torch "
                          "simulated-bifurcation`") from e
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    Qt = torch.tensor(Q, dtype=torch.float32, device=dev)
    x, _ = sb.minimize(Qt, domain="binary", agents=agents, max_steps=steps,
                       mode="discrete" if mode == "discrete" else "ballistic",
                       best_only=True, verbose=False)
    xb = x.cpu().numpy().astype(np.float64).ravel()
    if polish:
        xb = _local_search(Q, xb)
    return SBResult(x=xb, energy=qubo_energy(Q, xb),
                    seconds=time.perf_counter() - t0, n_agents=agents,
                    n_steps=steps, history=[], mode=mode + f"/torch:{dev}")


# --------------------------------------------------------------------------- #
def solve_qubo_sa(Q: np.ndarray, sweeps: int = 4000, restarts: int = 8,
                  seed: int = 0) -> SBResult:
    """Simulated annealing on the same QUBO. This is the baseline that isolates
    how much of the result is dSB and how much is just 'any decent heuristic'."""
    t0 = time.perf_counter()
    rng = np.random.default_rng(seed)
    n = Q.shape[0]
    Qs = 0.5 * (Q + Q.T)
    d = np.diag(Qs)
    scale = float(np.abs(Qs).max()) or 1.0
    best_x, best_e, history = None, np.inf, []
    for r in range(restarts):
        x = (rng.random(n) < 0.15).astype(np.float64)
        e = qubo_energy(Q, x)
        for s in range(sweeps):
            T = scale * (1.0 - s / sweeps) ** 3 + 1e-9
            i = int(rng.integers(n))
            lin = d[i] + 2.0 * (Qs[i] @ x - d[i] * x[i])
            delta = (1.0 - 2.0 * x[i]) * lin
            if delta < 0 or rng.random() < np.exp(-delta / T):
                x[i] = 1.0 - x[i]
                e += delta
        x = _local_search(Q, x)
        e = qubo_energy(Q, x)
        if e < best_e:
            best_x, best_e = x, e
        history.append((time.perf_counter() - t0, best_e))
    return SBResult(x=best_x, energy=best_e, seconds=time.perf_counter() - t0,
                    n_agents=restarts, n_steps=sweeps, history=history, mode="SA")
