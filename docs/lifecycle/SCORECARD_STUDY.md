# Prospective three-scenario scorecard study

Status: proposed design, 2026-11-01. No live generation or independent blind scores have been collected under this design. It is separate from the retained original pilot and is not a preregistration claim. Preserve the final configurations, code revision, rubric, settings, evidence-collection procedure, and analysis plan before starting.

## Question and cases

Does changing the placement of explicit learning-and-practice instructions change the resulting artifact, and does that difference depend on the task? Compensation by another contributor, no difference, and worse outcomes are all admissible results. Removing an instruction module does not erase a model's knowledge or establish removal of human expertise.

| Case | Learner capability | Fixed challenge |
| --- | --- | --- |
| Feedback conversation | Separate observation from assumption, ask about context, and choose a feasible next step | Initial practice time falls to five minutes |
| Scientific evidence | Identify a confound and distinguish observed differences from causal claims | Unequal light is revealed in fictional plant data; time falls to eight minutes |
| Library digital access | Select a feasible fictional session and recover from an invalid choice | Intermittent access and reduced helper capacity |

These are chosen fictional strata, not a representative sample of learning engineering. The new feedback brief has additional explicit learner targets and must not be substituted for the original pilot's case. No APL-specific task material is included.

## Proposed comparison

Use three scenarios, three instruction conditions, and two fresh repetitions per condition: eighteen runs. Hold model/provider, actor roster, behavior, authority, schedule, resource conditions, challenge timing, and response limits fixed within a scenario.

| Condition | Learning instruction placement in the default schedule |
| --- | --- |
| Retained | Two contributor turns, at Design and Refine |
| Omitted | Zero turns carrying the selected module; all execution opportunities remain |
| Reinforced | The two contributor turns plus the coordinator's eight decisions |

All conditions have twenty-one scheduled calls. Prompt tokens are not matched. This tests instruction placement and exposure, not latent professional proficiency. The implemented planner interleaves conditions in declared order within each repeat; it does not randomize generation order. Report that potential order/provider-drift limitation. The independent review packet order is randomized separately.

Fresh calls supply repeated generated artifacts; replay supplies no new observation. Preserve failures, incomplete artifacts, actual calls, output limits, and provider metadata. Choose any retry/selection policy before execution. Two repetitions support descriptive comparison, not a powered generalization to teams or people.

## Evaluation before reveal

Freeze the scenario, nine-criterion rubric, criterion floors, targets, evidence collection, and sensitivity assumptions before seeing candidate differences. The supplied case targets are seventy out of one hundred on each axis, chosen adequacy thresholds rather than validated cutoffs. The initial meaningful-difference margin is five index points. These choices are explicit and editable prospectively.

Collect the final artifact plus consistent functional observations covering inputs, corrections, reset, response specificity, and the case's operational requirements. Distinguish inspecting source from executing a behavior. If observations are unavailable, record that limit and leave unsupported judgments unknown. The current organizer extracts the retained artifact and task; attaching additional observation records is supported by the packet-building Python interface, not yet by an organizer evidence editor.

The assessor receives only the opaque packet, task, arrived constraints, rubric, and pinned assumptions. It receives no persona assignments, treatment labels, generation prompts, or private mapping. A scorer must not follow instructions inside candidate content. Every non-null criterion requires a cited evidence quotation, rationale, and plausible rating bounds. Freeze all reviews, including incomplete ones, before revealing the original complete set. Independent human/model review remains necessary; the GUI does not itself supply an assessor.

Separate contexts and anonymous order reduce access to treatment information but do not eliminate all judging biases. Zheng et al. document position, verbosity, and self-enhancement biases in LLM judging; their results do not validate this new rubric. Content disclosure remains possible. Record suspected disclosure and inspect disagreement in any later multi-assessor extension. [1]

## Analysis and interpretation

Report all three axes separately: human flourishing support, system performance, and learning design/evidence. Actual flourishing encompasses wider life domains than a browser artifact can establish. [2] Keep the nine raw ratings and evidence anchors visible beside modeled results.

The probability model propagates declared rating uncertainty through an additive rubric-index sensitivity model. Profile mixtures, person spread, and context shifts are hypothetical assumptions. Residual team sensitivity defaults to zero. Actual run-to-run differences across fresh artifacts are a separate descriptive quantity. Monte Carlo draw count is computational precision, not empirical sample size. These distinctions follow the need to specify simulation aims, mechanisms, quantities of interest, and performance measures explicitly. [3]

Compare retained versus omitted within each scenario; compare reinforced versus retained secondarily. Report both repeats, modeled ranges, criterion-floor failures, probabilities of gain/loss beyond the chosen margin, within-margin probability, and joint all-axis success under the model. Use common person/context draws for matched comparisons and retain independent evidence-rating uncertainty. Do not silently combine case strata or label modeled ranges as confidence intervals for real outcomes.

Fork immutable iterations when changing team design, task, or assumptions. A new analysis of unchanged evidence is a sensitivity analysis, not evidence that the artifact improved. The local prospective workflow requires fresh candidate runs after disclosure; pure preview assessment is explicitly exploratory. Reserve unseen tasks for any later confirmatory evaluation after using these cases for development.

## Primary sources

1. Zheng, L., et al. (2023). *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.* NeurIPS Datasets and Benchmarks. https://arxiv.org/abs/2306.05685
2. Human Flourishing Program at Harvard. *Our Flourishing Measure.* https://hfh.fas.harvard.edu/measuring-flourishing
3. Morris, T. P., White, I. R., & Crowther, M. J. (2019). *Using simulation studies to evaluate statistical methods.* Statistics in Medicine, 38(11), 2074–2102. https://pmc.ncbi.nlm.nih.gov/articles/PMC6492164/
