# Blind probabilistic scorecard

This document defines the implemented artifact-only `blind-scorecard-v1` and full-solution `blind-scorecard-v2` evidence models so their results can be inspected and replayed. They use the same rubric and conditional probability calculation, with different review evidence scopes.

## What the three axes mean

The scorecard preserves **human flourishing**, **system performance**, and **learning** as separate axes. It has no overall weighted score. The human flourishing rubric concerns task-level support for agency, inclusion, and reasonable burden. It does not measure a person's flourishing. The learning rubric concerns alignment, consequential practice and feedback, and the design of evidence for independent capability. It does not estimate an observed learning gain.

The inputs are human or model-assisted reviews of an opaque candidate's task, constraints, actual HTML source, any retained observation records, and, for full-solution packets, integrated design records. Reviewers score nine criteria from 0 to 4, with a lower and upper plausible rating bound. Every non-null rating requires a rationale and an exact short quotation with a locator from the identified evidence item. Quotation checks establish traceability, not the truth of a judgment. Source inspection must be distinguished from an executed functional check. Missing evidence remains unknown; any unknown criterion makes the assessment incomplete with no numerical probability output.

## Two explicit evidence scopes

New packets use schema version 2 with `evaluation_scope: "full_solution"`. Evidence `E1` is the exact retained Build HTML. Supplied observations follow, then the latest integrated artifact record from each available stage, labeled `generated_plan`. These records retain design decisions, operating assumptions, and proposed revisions. They exclude raw member and coordinator messages, source sequence references, actor metadata, and additional executable code.

Generated plans do not establish that a proposed repair exists in the retained Build. Every plan and the review prompt state that implementation credit requires support from `E1` or separately supplied observations. Human learning, usability, transfer, and flourishing remain unobserved unless suitable human evidence is supplied.

Legacy schema-version-1 packets retain their original artifact-plus-observations structure. `build_blind_packet(..., evaluation_scope="artifact")` can explicitly prepare that scope. Existing frozen v1 reviews replay under the retained legacy model identity; their packet, review, and assessment hashes are not rewritten. The local packet API also accepts an optional `evaluation_scope`. Once a candidate belongs to an assessment set, its evidence scope is pinned. A scope change cannot replace its original set or evade a recorded assignment reveal.

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

Matched comparisons require identical evaluation scope, task and environmental constraints, scenario contract, rubric, model identity, and full settings. Artifact-only and full-solution reviews cannot be compared as paired treatment effects. Person/profile and context random draws are shared across candidates through deterministic seeds. Evidence-rating uncertainty is independently keyed to each candidate review, so the comparison does not assume unsupported perfect agreement in reviewer uncertainty. Optional residual team sensitivity is also independently keyed. With point-valued identical evidence ratings and the default zero residual team sensitivity, identical candidates have an exact zero paired difference despite different opaque IDs or treatment words in source text.

A comparison reports paired mean and quantile differences; probability of a gain exceeding the prespecified meaningful-difference margin; probability of a loss beyond that margin; probability of remaining within the margin; probability of gain plus a passing target; and probability of a gate regression. These are conditional model contrasts, not causal estimates or hypothesis tests about learners.

Observed differences across generated candidates are a separate descriptive layer. After reveal, strata retain scenario, exact task, evaluation scope, rubric, settings, model version, condition, and iteration. The mean and standard deviation across distinct saved candidate runs are reported only within such a stratum. A single candidate has no estimated between-candidate standard deviation. Multiple reviews of the same `(run_id, artifact_hash)` do not create additional generated-team replications. No pooled average silently combines different scenarios or evidence scopes.

## Blindness, freezing, and replay

`build_blind_packet` verifies the source journal, extracts the retained Build artifact's HTML, and includes the task's seed, fixed resources and time pressure, environmental constraints, and actually arrived challenges. Challenge timing is marked relative to the retained artifact. Full-solution packets also include the generated stage records described above. Future configured challenges, simulated outcome scores, raw conversations, agent metadata, competency assignments, and condition labels are excluded. Separate mappings link the packet to the saved run, journal head, full artifact-object hash, scored HTML source hash, and evaluation scope.

Assignment metadata is withheld, but candidate text or source may reveal a role or condition. The packet always discloses that risk. An operator who produced the candidates is not made blind merely by using opaque IDs. The separate review workspace should receive only public packets and pinned settings. A human or independent model reviewer must avoid using an assignment key or source journal while rating.

The frozen record contains the complete public packet, validated review, settings, assessment, conditional samples, provenance hashes, and a record hash. Validation recomputes the assessment exactly from the embedded inputs and checks the backend source version. The local store enforces freezing before reveal and retains the reveal boundary; a JSON flag alone cannot establish that chronology. Hashes establish internal consistency, not independent authenticity of an imported assignment map. Editing a frozen review or changing the case after reveal requires a new prospective iteration.

Evidence SHA-256 hashes cover raw UTF-8 text. Other hashes cover canonical sorted JSON excluding the object's own hash field. Numbers are finite and use bounded precision; integral floats and negative zero normalize to browser-compatible forms. The v2 model hash covers the scoring catalog and the five scoring modules, including `scorecard_solution.py`. The canonical v1 identity is retained with a complete frozen compatibility fixture. Exact replay requires supported model semantics; an unknown historical model is not silently relabeled as the current scorer.

## Interface and verification

The public facade is `tools/lifecycle/experiment_scorecard.py`; its packet/review contracts, generated-plan extraction, settings, and sampler are split into focused modules. `docs/lifecycle/scorecard-contract-example.json` retains an artifact-only example. API and persistent store operations are implemented separately from these pure scoring functions.

Run the offline verification suite with:

```sh
python -m unittest discover -s tools/lifecycle/tests -p 'test_*scorecard*.py' -v
```

The tests address exact-null and monotone point-score behavior, non-compensable gaps, independent review uncertainty, missing evidence, metadata masking, changed-task and cross-scope comparison rejection, immutable scope pinning, checksum tampering, deterministic replay, complete v1 compatibility, latest-stage selection, distinct-candidate counting, and Python/JavaScript hash parity. Test ratings are authored method fixtures and are not scientific findings. This implementation leaves `declared-design-v1` and retained pilot outcomes unchanged.
