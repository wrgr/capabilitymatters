# Blind probabilistic scorecard

This document defines the implemented `blind-scorecard-v1` evidence and probability model so its results can be inspected and replayed.

## What the three axes mean

The scorecard preserves **human flourishing**, **system performance**, and **learning** as separate axes. It has no overall weighted score. The human flourishing rubric concerns task-level support for agency, inclusion, and reasonable burden. It does not measure a person's flourishing. The learning rubric concerns alignment, consequential practice and feedback, and the design of evidence for independent capability. It does not estimate an observed learning gain.

The inputs are human or model-assisted reviews of an opaque candidate's task, constraints, actual HTML source, and any retained observation records. Reviewers score nine criteria from 0 to 4, with a lower and upper plausible rating bound. Every non-null rating requires a rationale and an exact short quotation with a locator from the identified evidence item. Quotation checks establish traceability, not the truth of a judgment. Source inspection must be distinguished from an executed functional check. Missing evidence remains unknown; any unknown criterion makes the assessment incomplete with no numerical probability output.

| Axis | Criteria |
| --- | --- |
| Human flourishing | Agency and dignity; access and inclusion; burden and wellbeing |
| System performance | Functional correctness; reliability and recovery; feasibility |
| Learning | Capability alignment; practice feedback and revision; learning evidence design |

Criteria receive equal weights within each axis. A separate gate prevents compensation for specified gaps: the default floor is 2 for all three human criteria, functional correctness, alignment, and practice feedback. Remaining floors are 0. These are editable, illustrative normative choices and must be pinned with the other settings. For example, agency 0 with access 4 and burden 4 produces an index of 66.67, but fails the human axis gate even if the numerical threshold is 60.

## What a probability means

A reported axis probability is the conditional probability that a hypothetical cohort's rubric index reaches its declared threshold **and** every applicable criterion floor passes, under the retained evidence ratings and simulation assumptions. It is not a calibrated probability of human success. The scenario presets use thresholds of 70; generic settings use 60. Scenario defaults are used when no explicit settings override them.

Each modeled draw performs these steps:

1. Sample a rating for each criterion from a triangular distribution with the review's lower bound, central score, and upper bound. Equal bounds produce a fixed value. Average the three ratings within an axis and multiply by 25 to obtain an index from 0 to 100. Compute the criterion gates from the same rating draw.
2. Sample a common context disturbance and optional residual team disturbance for the draw. Each is a three-axis Gaussian vector with the declared shared correlation. The residual team sensitivity is zero by default.
3. For each hypothetical person, sample a profile from the scenario's explicit mixture and a correlated three-axis person disturbance. Add the profile shift and disturbances to the axis index, then clip the result to 0–100.
4. Retain the cohort mean on each axis, the fraction of hypothetical people passing each gated axis, and the fraction passing all three. Evaluate whether all three cohort means and all criterion gates pass in the same draw.

For axis `a`, the person index is:

```text
clip(
    25 * mean(sampled criterion ratings for a)
    + context_z[a] * scenario_sd[a]
    + residual_team_z[a] * team_sd[a]
    + profile.axis_shift[a] * profile_shift_scale
    + person_z[a] * profile.axis_sd[a] * person_sd_scale,
    0, 100
)
```

The profile shifts, dispersions, mixture weights, and context sensitivity are illustrative assumptions, not estimates fitted to people. `person_sd_scale` defaults to 1 and permits 0–3; `profile_shift_scale` defaults to 1 and permits 0–2. They enable explicit sensitivity analysis while preserving the versioned profile mixture. The model assumes additive disturbances, normal latent variation, fixed profile effects across candidates, and clipping at the index boundaries. These choices are inspectable limitations. The current model does not simulate individual decision processes or infer new human behavior from code.

The output retains the mean and 5th, 50th, and 95th percentiles of cohort means, threshold-only probability, gate-failure probability, gated threshold probability, and the joint all-axis probability. Hypothetical person-pass fractions are reported separately from the probability that a cohort mean passes. The Bernoulli Monte Carlo standard error describes numerical precision conditional on this model. The modeled interval is not a confidence interval for observed human outcomes. More draws improve numerical precision; they do not increase empirical sample size. The reported independent empirical sample size is always zero.

## Matched comparison and variation

Matched comparisons require identical task and environmental constraints, scenario contract, rubric, backend source hash, and full settings. Person/profile and context random draws are shared across candidates through deterministic seeds. Evidence-rating uncertainty is independently keyed to each candidate review, so the comparison does not assume unsupported perfect agreement in reviewer uncertainty. Optional residual team sensitivity is also independently keyed. With point-valued identical evidence ratings and the default zero residual team sensitivity, identical candidates have an exact zero paired difference despite different opaque IDs or treatment words in source text.

A comparison reports paired mean and quantile differences; probability of a gain exceeding the prespecified meaningful-difference margin; probability of a loss beyond that margin; probability of remaining within the margin; probability of gain plus a passing target; and probability of a gate regression. These are conditional model contrasts, not causal estimates or hypothesis tests about learners.

Observed differences across generated candidates are a separate descriptive layer. After reveal, strata retain scenario, exact task, rubric, settings, model version, condition, and iteration. The mean and standard deviation across distinct saved candidate runs are reported only within such a stratum. A single candidate has no estimated between-candidate standard deviation. Multiple reviews of the same `(run_id, artifact_hash)` do not create additional generated-team replications. No pooled average silently combines the three scenarios.

## Blindness, freezing, and replay

`build_blind_packet` verifies the source journal, extracts the retained Build artifact's HTML, and includes the task's seed, fixed resources and time pressure, environmental constraints, and actually arrived challenges. Challenge timing is marked relative to the retained artifact. Future configured challenges, declared design scores, agent identities, competency assignments, and condition labels are excluded. Separate mappings link the packet to the saved run, journal head, full artifact-object hash, and scored HTML source hash.

Assignment metadata is withheld, but candidate text or source may reveal a role or condition. The packet always discloses that risk. An operator who produced the candidates is not made blind merely by using opaque IDs. The separate review workspace should receive only public packets and pinned settings. A human or independent model reviewer must avoid using an assignment key or source journal while rating.

The frozen record contains the complete public packet, validated review, settings, assessment, conditional samples, provenance hashes, and a record hash. Validation recomputes the assessment exactly from the embedded inputs and checks the backend source version. The local store enforces freezing before reveal and retains the reveal boundary; a JSON flag alone cannot establish that chronology. Hashes establish internal consistency, not independent authenticity of an imported assignment map. Editing a frozen review or changing the case after reveal requires a new prospective iteration.

Evidence SHA-256 hashes cover raw UTF-8 text. Other hashes cover canonical sorted JSON excluding the object's own hash field. Numbers are finite and use bounded precision; integral floats and negative zero normalize to browser-compatible forms. The backend model hash covers the scoring catalog and all four scoring module source files. Exact replay requires that implementation version.

## Interface and verification

The public facade is `tools/lifecycle/experiment_scorecard.py`; its packet/review contracts, settings, and sampler are split into three focused modules. `docs/lifecycle/scorecard-contract-example.json` supplies a concrete packet, unknown review, settings, and frozen example. API and persistent store operations are implemented separately from these pure scoring functions.

Run the offline verification suite with:

```sh
python -m unittest tools/lifecycle/tests/test_experiment_scorecard.py -v
```

The tests address exact-null and monotone point-score behavior, non-compensable gaps, independent review uncertainty, missing evidence, metadata masking, changed-task comparison rejection, checksum tampering, deterministic replay, distinct-candidate counting, and Python/JavaScript hash parity. Test ratings are authored method fixtures and are not scientific findings. This implementation leaves `declared-design-v1` and retained pilot outcomes unchanged.
