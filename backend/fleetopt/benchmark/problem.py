"""A pymoo-compatible view of the same problem, so the baselines are honest.

Everything downstream of the search is shared: the same option set, the same
repair, the same evaluator. Only the SEARCH differs. That is the whole point --
if NSGA-III used a different decoder or a different cost model, beating it would
prove nothing.

Encoding is random-key, which is the standard way to hand a mixed
integer/continuous problem to a real-valued EA:

    x[0:P]    in [0,1)  ->  which option serves parcel p (or skip, if optional)
    x[P:2P]   in [0,1]  ->  the speed policy beta for that parcel

Decoding runs repair_solution, so an EA cannot produce an illegal plan any more
than dSB can.
"""
from __future__ import annotations
import numpy as np

from ..io.schema import Instance
from ..master.option_gen import Option, group_by_parcel
from ..master.qubo import repair_solution
from ..outer.plan import Plan, realise


class PlanCodec:
    def __init__(self, inst: Instance, options: list[Option],
                 mandatory: dict[str, bool]):
        self.inst, self.options, self.mandatory = inst, options, mandatory
        g = group_by_parcel(options)
        self.pids = sorted(g)
        # options per parcel, cheapest first, so low keys mean sensible choices
        self.by_pid = {p: sorted(g[p], key=lambda o: o.net_usd) for p in self.pids}
        self.P = len(self.pids)
        self.n_var = 2 * self.P
        self.n_eval = 0

    def decode(self, x: np.ndarray) -> Plan:
        chosen, betas = [], []
        for i, pid in enumerate(self.pids):
            opts = self.by_pid[pid]
            k = len(opts)
            slots = k if self.mandatory.get(pid, True) else k + 1   # +1 = skip
            j = min(int(x[i] * slots), slots - 1)
            if j >= k:
                continue                                            # skipped
            chosen.append(opts[j])
            betas.append(float(x[self.P + i]))
        kept = repair_solution(chosen, self.options, self.mandatory)
        # keep each kept option's own beta; repair may have added or dropped some
        bmap = {o.idx: b for o, b in zip(chosen, betas)}
        beta = np.array([bmap.get(o.idx, 0.0) for o in kept], float)
        self.n_eval += 1
        return realise(self.inst, self.options,
                       Plan([o.idx for o in kept], np.clip(beta, 0, 1)))

    def evaluate_batch(self, X: np.ndarray) -> tuple[np.ndarray, list[Plan]]:
        plans = [self.decode(row) for row in np.atleast_2d(X)]
        return np.array([p.objectives for p in plans], float), plans


def make_pymoo_problem(codec: PlanCodec):
    from pymoo.core.problem import ElementwiseProblem

    class FleetProblem(ElementwiseProblem):
        def __init__(self):
            super().__init__(n_var=codec.n_var, n_obj=3, n_ieq_constr=0,
                             xl=0.0, xu=1.0)
            self.archive: list[Plan] = []

        def _evaluate(self, x, out, *args, **kwargs):
            plan = codec.decode(np.asarray(x, float))
            self.archive.append(plan)
            out["F"] = np.array(plan.objectives, float)

    return FleetProblem()
