"""L3 (revised) -- SMS-EMOA selection + QPSO variation on the maritime problem.

Replaces moead_awa.py as the recommended search layer after the M6 benchmark:
at equal wall clock on the 24-parcel instance, SMS-EMOA reached HV 0.769 and
NSGA-III 0.743 against MOEA/D-AWA + dSB at 0.674, and the gap WIDENED at 48
parcels rather than closing.

Why SMS-EMOA specifically: its survival operator directly optimises
hypervolume -- it evicts whichever individual contributes least HV. Every
alternative optimises a proxy (scalarised weights, crowding distance) and hopes
HV follows. When the reported metric is HV, the algorithm that optimises HV
wins. Say that out loud rather than presenting it as luck.

What remains quantum-inspired:
  * QPSO supplies all variation -- delta-potential-well sampling, no rotation
    tables. It is in the main loop, every generation.
  * dSB seeds generation 0 from an Ising/QUBO weight sweep, so the Hamiltonian
    formulation stays on the critical path at ~2% of the budget.

Run the three-way ablation (random init / dSB-seeded / dSB-seeded + QPSO) and
report whichever wins. Do not assume the seeding helps.

IMPLEMENTATION NOTE. This wraps pymoo's SMSEMOA rather than re-implementing it.
A hand-rolled version using crowding distance as the eviction proxy scored
HV 0.523 against MOEA/D-AWA's 0.583 on the maritime instance -- worse, because
exact hypervolume contribution is the whole point of SMS-EMOA and the proxy
throws it away. pymoo's SMSEMOA computes it properly and scored 0.769 in M6.
Use the library. Comparing our implementation quality against pymoo's proves
nothing either way.

ABLATION, 30 s each, 24-parcel maritime instance, shared HV reference box:

    SMS-EMOA + SBX  + dSB seeding    HV 0.6626   210 pts   6840 evals   <- best
    SMS-EMOA + QPSO + dSB seeding    HV 0.6230    67 pts   5040 evals   (default)
    SMS-EMOA + QPSO, random init     HV 0.5971    65 pts   4920 evals
    MOEA/D-AWA + dSB (old L3)        HV 0.5817   278 pts   2912 evals

Read it honestly:
  * dSB seeding HELPS: +4.3% HV (0.5971 -> 0.6230). Keep it.
  * QPSO HURTS: -6.0% HV against stock SBX+PM (0.6626 -> 0.6230). SBX and
    polynomial mutation are decades-tuned for exactly this kind of real-valued
    landscape, and QPSO does not beat them here or on ZDT3/DTLZ1.

The default is use_qpso=True because SIH26138 requires a quantum-inspired
method and QPSO is the component that puts one in the main loop. That is a
DELIBERATE 6% trade, not an oversight -- set use_qpso=False for the highest
raw hypervolume and say which configuration produced any number you report.

moead_awa.py is kept as a benchmarked baseline, not deleted.
"""
from __future__ import annotations
from dataclasses import dataclass
import time
import numpy as np

from ..io.schema import Instance
from ..master.option_gen import Option
from ..master.qubo import build_qubo, decode as qdecode, repair_solution
from ..master.dsb import solve_qubo
from ..benchmark.problem import PlanCodec, make_pymoo_problem
from ..benchmark.standard_ops import QPSOMutation, NoCrossover
from .plan import Plan, make_plan
from .archive import Archive
from . import moead_awa as MO


@dataclass
class SMSResult:
    archive: Archive
    history: list                 # (seconds, archive size, best f1)
    n_evals: int
    n_dsb_calls: int
    seconds: float


def _seed_population(inst, options, mandatory, codec, pop_size, n_vectors,
                     seed, t0, budget, archive):
    """dSB weight sweep -> genome-space initial population.

    Keeps the Ising/QUBO formulation on the critical path at ~2% of the budget.
    Whether it actually helps is an ABLATION -- run use_dsb_seeding=False and
    compare before claiming it does.
    """
    rng = np.random.default_rng(seed)
    X = rng.random((pop_size, codec.n_var))
    n_dsb = 0
    W = MO.das_dennis(6)[:n_vectors]
    for j, w in enumerate(W):
        if j >= pop_size or time.perf_counter() - t0 > budget * 0.25:
            break
        Q, _, _ = build_qubo(options, mandatory, weights=tuple(w))
        r = solve_qubo(Q, agents=8, steps=250, seed=seed * 100 + j)
        n_dsb += 1
        chosen = repair_solution(qdecode(r.x, options), options, mandatory)
        beta = float(np.clip(w[1] * 1.2, 0.0, 1.0))
        archive.add(make_plan(inst, options, chosen, beta))
        for i, pid in enumerate(codec.pids):
            opts = codec.by_pid[pid]
            sel = next((o for o in chosen if o.parcel_id == pid), None)
            slots = len(opts) if mandatory.get(pid, True) else len(opts) + 1
            idx = opts.index(sel) if sel in opts else len(opts)
            X[j, i] = (idx + 0.5) / slots
            X[j, codec.P + i] = beta
    return X, n_dsb


def run(inst: Instance, options: list[Option], mandatory: dict[str, bool],
        pop_size: int = 60, max_seconds: float = 60.0, seed: int = 0,
        dsb_seed_vectors: int = 12, use_dsb_seeding: bool = True,
        use_qpso: bool = True, verbose: bool = True) -> SMSResult:

    from pymoo.optimize import minimize
    from pymoo.algorithms.moo.sms import SMSEMOA
    from pymoo.termination.max_time import TimeBasedTermination
    from pymoo.operators.sampling.rnd import FloatRandomSampling
    from pymoo.operators.crossover.sbx import SBX
    from pymoo.operators.mutation.pm import PM

    t0 = time.perf_counter()
    codec = PlanCodec(inst, options, mandatory)
    archive = Archive(cap=400)
    n_dsb = 0

    if use_dsb_seeding:
        X0, n_dsb = _seed_population(inst, options, mandatory, codec, pop_size,
                                     dsb_seed_vectors, seed, t0, max_seconds,
                                     archive)
        sampling = X0
    else:
        sampling = FloatRandomSampling()

    if use_qpso:
        crossover, mutation = NoCrossover(), QPSOMutation(prob=0.3)
    else:
        crossover, mutation = SBX(eta=15, prob=0.9), PM(eta=20)

    problem = make_pymoo_problem(codec)
    algo = SMSEMOA(pop_size=pop_size, sampling=sampling,
                   crossover=crossover, mutation=mutation)
    remaining = max(1.0, max_seconds - (time.perf_counter() - t0))
    minimize(problem, algo, TimeBasedTermination(remaining), seed=seed,
             verbose=False)

    for pl in problem.archive:
        archive.add(pl)

    secs = time.perf_counter() - t0
    if verbose:
        print(f"    SMS-EMOA{'+QPSO' if use_qpso else '+SBX'}: "
              f"{len(archive.plans)} archive pts, {codec.n_eval} evals, "
              f"{n_dsb} dSB seeds, {secs:.1f} s")
    F = archive.F
    history = [(secs, len(archive.plans),
                float(F[:, 0].min()) if len(F) else 0.0)]
    return SMSResult(archive, history, codec.n_eval, n_dsb, secs)
