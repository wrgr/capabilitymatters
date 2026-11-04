# Competency mediation pilot — reproducibility notes

This is a **mechanistic fixture**, not a live model-generated collaboration experiment. It is intentionally not appended to the historical dynamic-flower evidence or presented as human data.

```bash
python3 tools/lifecycle/competency_mediation_pilot.py mvp > mvp.json
python3 tools/lifecycle/competency_mediation_pilot.py v2 > v2.json
```

The MVP uses 3 seeds, 1 world variant and 3 conditions. The v2 uses 40 seeds, 2 variants and 3 conditions. Each design is frozen then subjected to 3 stress levels. A policy agent never has specialist-only actions unless consultation occurred. The same event index is used across conditions. The experiment checks replay, budget and specialist-access boundaries. Proposed interventions and result effects are **authored assumptions**, not expert estimates.

The default branch historical manuscript `src/papers/flower-team-study.md` is deliberately untouched. Read `docs/lifecycle/competency-mediation-paper-v2.md` for the new paper direction.

Next validation gates: calibrate real-agent competency probes; isolate specialist reference access; factorially separate specialist availability from integration; blinded human review of decision traces; human learner transfer evaluation. No paper claims beyond simulated mechanism demonstration should be made before those gates.
