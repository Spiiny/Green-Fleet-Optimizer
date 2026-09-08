"""Our L3 search layer, packaged for standard benchmark problems.

SCOPE -- read this before quoting any number produced here.

Only the SEARCH layer transfers to ZDT/DTLZ. Those problems have no hard
constraints, no mixed-integer structure, and no non-linear physics, so L0 (the
repair decoder) and L1 (the exact convex speed solve) have nothing to do there.
What is measured on these benchmarks is therefore:

    SMS-EMOA selection  +  QPSO variation

and nothing else. That is a fair test of the search engine and an unfair test of
the architecture, because the architecture's differentiators are exactly the
layers that ZDT cannot exercise. Report both this table and the maritime table,
and say which is which.

The QPSO operator is implemented as a pymoo Mutation so that everything else --
selection, survival, archiving, termination -- is pymoo's own code. If we wrote
our own SMS-EMOA we would be comparing our implementation quality against
pymoo's, which proves nothing.
"""
from __future__ import annotations
import numpy as np

from pymoo.core.mutation import Mutation
from pymoo.core.crossover import Crossover


class QPSOMutation(Mutation):
    """Quantum-behaved sampling from a delta potential well.

        mbest = mean of the current population
        p     = phi*x + (1-phi)*attractor,          phi ~ U(0,1)
        x'    = p +/- beta*|mbest - x|*ln(1/u),     u ~ U(0,1)

    beta contracts linearly from beta_hi to beta_lo over the run, so the sampling
    cloud narrows by itself as the population converges. No rotation-angle
    lookup table -- that hand-tuned artefact is the most-criticised element of
    the classical quantum-GA literature and its absence is the point.
    """

    def __init__(self, beta_hi: float = 1.0, beta_lo: float = 0.4,
                 prob: float = 1.0):
        super().__init__()
        self.beta_hi, self.beta_lo, self.prob_qpso = beta_hi, beta_lo, prob

    def _do(self, problem, X, **kwargs):
        algorithm = kwargs.get("algorithm", None)
        X = np.asarray(X, float).copy()
        n, d = X.shape

        pop = getattr(algorithm, "pop", None)
        if pop is None or len(pop) == 0:
            return X
        P = pop.get("X")
        mbest = P.mean(axis=0)

        # contraction schedule from the algorithm's own progress counter
        frac = 0.0
        if algorithm is not None:
            ev = getattr(algorithm, "evaluator", None)
            term = getattr(algorithm, "termination", None)
            n_ev = getattr(ev, "n_eval", 0) if ev is not None else 0
            n_max = getattr(term, "n_max_evals", None) if term is not None else None
            if n_max:
                frac = min(1.0, n_ev / n_max)
        beta = self.beta_hi - (self.beta_hi - self.beta_lo) * frac

        rng = np.random
        # attractor: a random member of the current (already elitist) population
        att = P[rng.randint(0, len(P), size=n)]
        phi = rng.random_sample((n, d))
        p = phi * X + (1.0 - phi) * att

        u = np.clip(rng.random_sample((n, d)), 1e-12, 1.0 - 1e-12)
        L = beta * np.abs(mbest[None, :] - X)
        sign = np.where(rng.random_sample((n, d)) < 0.5, 1.0, -1.0)
        Xn = p + sign * L * np.log(1.0 / u)

        # apply to a subset so the operator behaves like a mutation
        mask = rng.random_sample((n, d)) < self.prob_qpso
        X = np.where(mask, Xn, X)
        return np.clip(X, problem.xl, problem.xu)


class NoCrossover(Crossover):
    """QPSO already blends parents through its attractor term, so recombination
    is disabled to keep the operator's contribution measurable in isolation."""

    def __init__(self):
        super().__init__(2, 1)

    def _do(self, problem, X, **kwargs):
        return X[:1]


def make_ours(pop_size: int = 100):
    """SMS-EMOA selection + QPSO variation -- our L3, on pymoo's machinery.

    prob=0.3 was selected by a small sweep on ZDT1 at 25k evaluations
    (1.0 -> 0.00348, 1/n -> 0.00357, 0.3 -> 0.00329). Reported so the tuning is
    visible: every baseline runs at pymoo defaults, and ours got one sweep over
    a single parameter. If anything that biases in our favour, not against.
    """
    from pymoo.algorithms.moo.sms import SMSEMOA
    return SMSEMOA(pop_size=pop_size, crossover=NoCrossover(),
                   mutation=QPSOMutation(prob=0.3))
