"""Quantum-behaved particle sampling -- the quantum-inspired variation operator.

A classical GA makes a child by blending two parents and adding a small nudge.
QPSO instead treats the particle as having no definite position: the next
position is DRAWN from a probability cloud (a delta potential well) centred on an
attractor, with a width proportional to the spread of the swarm.

    mbest = mean of the personal bests
    p     = phi * pbest + (1 - phi) * gbest,        phi ~ U(0,1)
    x'    = p  +/-  beta * |mbest - x| * ln(1/u),   u ~ U(0,1)

The width term contracts by itself as the swarm converges: wide exploration
early, fine tuning late. Crucially there is NO rotation-angle lookup table --
that hand-tuned artefact is the most-criticised part of the older quantum GA
literature, and its absence here is a point worth making in the writeup. The
only parameter is beta, and it follows a fixed linear schedule.
"""
from __future__ import annotations
import numpy as np


def contraction(t: int, T: int, hi: float = 1.0, lo: float = 0.4) -> float:
    """beta: linear from hi to lo over the run."""
    return hi - (hi - lo) * (t / max(T - 1, 1))


def sample(x: np.ndarray, pbest: np.ndarray, gbest: np.ndarray,
           mbest: np.ndarray, beta: float, rng: np.random.Generator,
           lo: float = 0.0, hi: float = 1.0) -> np.ndarray:
    n = len(x)
    phi = rng.random(n)
    p = phi * pbest + (1.0 - phi) * gbest
    u = np.clip(rng.random(n), 1e-12, 1.0 - 1e-12)
    L = beta * np.abs(mbest - x)
    sign = np.where(rng.random(n) < 0.5, 1.0, -1.0)
    out = p + sign * L * np.log(1.0 / u)
    return np.clip(out, lo, hi)


def mean_best(pbests: np.ndarray) -> np.ndarray:
    return pbests.mean(axis=0)
