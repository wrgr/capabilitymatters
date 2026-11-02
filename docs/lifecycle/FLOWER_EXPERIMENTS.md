# Experiments using the learning engineering flower

The current experiment preset organizes team contributions around the learning
engineering flower described by [Ali and colleagues (2025)](https://doi.org/10.59668/2109.21837).
Shared understanding is the center. Every member, including the coordinator,
retains responsibility for connecting the work to learners and other stakeholders.
Those people must still participate in a real project; assigning an agent does
not supply their knowledge, consent, or agreement.

The flower provides eight starting expertise domains. It is non-exhaustive and
team composition can change with the challenge and stage. The instruction
packages below request contributions in the simulation. They do not establish
individual mastery, provide validated measures of professional competence, or
map the flower onto a separate competency taxonomy.

| Flower domain | Requested contribution | Default contribution stages |
| --- | --- | --- |
| Learning Sciences | Learning mechanisms, prior knowledge, practice, retention, transfer | Understand, Design, Evaluate, Refine |
| Learning Experience Design | Learner journeys, activity structure, feedback, revision | Understand, Design, Build, Refine |
| Data Science | Data quality, analysis, uncertainty, model assumptions | Map, Instrument, Evaluate, Refine |
| Assessment, Measurement, Evaluation | Constructs, measures, comparisons, limits of inference | Map, Instrument, Evaluate, Refine |
| Learning Environment Engineering | Operating environment, dependencies, access, recovery | Understand, Map, Build, Experiment |
| Software Engineering | Executable behavior, state management, testing, maintenance | Build, Instrument, Experiment, Evaluate |
| Subject-Matter Expertise | Content accuracy, authentic tasks, consequential errors | Understand, Map, Design, Experiment |
| Education and Training Professionals | Facilitation, learner support, adoption, delivery conditions | Design, Build, Instrument, Experiment |

The reference preset assigns one member to each domain and a separate
coordinator. Four contributions per domain plus one coordinator decision at
each of eight stages produces **40 calls per complete run**. Stage assignments
are configurable implementation choices. Identity, domain responsibility,
requested behavior, authority, availability, and execution opportunities remain
separate fields.

## Five comparisons

Every arm starts from the same configured reference team, case facts,
environment, challenges, model, output limit, integration setting, and outcome
assumptions. The selected domain is retained in the reference arm. Other user
edits remain visible. The standard selection targets the member assigned
Assessment, Measurement, Evaluation.

| Condition | Intervention | Calls with the default preset |
| --- | --- | ---: |
| Full team | Retain the reference assignments and available members | 40 |
| Domain omitted everywhere | Remove the selected explicit domain package from every resolved member, including the coordinator, while retaining their work slots | 40 |
| Domain withdrawn from one member | Remove that package only from the selected member, preserving colleagues' overlapping assignments and every work slot | 40 |
| Member removed | Make that member unavailable; remove their contribution opportunities and all their assigned contributions | 36 |
| One individual with matched slots | One identity performs the reference contribution and coordinator slots; each slot retains its original domain exposure and authority | 40 |

The default has one assignee per domain. In that arrangement global omission and
single-member withdrawal remove the same explicit instructions. The matching
audit marks this equivalence. To investigate compensation, first assign the
selected domain to another member at a relevant stage. That overlap becomes part
of the common reference configuration in every arm. The software does not add a
hidden compensator or force an omission to produce a failure.

Member removal changes work capacity as well as domain coverage; it cannot be
interpreted as a pure responsibility contrast. The individual comparison matches
contribution opportunities and scheduled domain exposure, not tokens, elapsed
time, or human workload. If source members have different requested behaviors,
the audit identifies the slots whose behavior changes under the individual's
selected profile. Names and roles can also cue the underlying model.

The runner records hashes for case information, opportunities, instruction
exposure, behavior, authority, environment, challenges, integration, and actor
identity. Each plan exposes which match the reference. This is an experimental
control record, not a quality score. Shared learner/stakeholder responsibilities
remain assigned in all conditions.

## Running and reviewing

The static [experiment studio](https://capabilitymatters.org/agentic-le/experiments/)
supports configuration and export. Fresh execution requires the local runner.
The default configuration uses offline fixtures; these exercise the pipeline
and make no empirical claims about team contributions or learner outcomes.

```bash
python3 tools/lifecycle/experiment_batch.py --comparison flower \
  --competency assessment_measurement_evaluation --actor-id member-4 --plan
python3 tools/lifecycle/experiment_batch.py --comparison flower \
  --competency assessment_measurement_evaluation --actor-id member-4
```

The first command prints a plan without running it. The second executes the
default offline fixtures and retains the records under `data/lifecycle/`.
Three repetitions across five arms schedule **15 runs and 588 calls**; four
40-call arms plus one 36-call arm produce 196 calls per repetition. Ordering is
replicate-major with a fixed declared condition order, not randomized. Configure
repetitions, domain overlap, scenario, and integration mode in the studio and
use `--config path/to/exported.json` to execute that configuration.

Live execution requires an explicitly named model, the Codex CLI, and
`CAPABILITY_MATTERS_LIVE=1`. The accepted response-character bound is not a
token or spending cap. Changing settings does not rerun or rewrite an old
journal. An actual scored study must retain new model responses and artifacts,
review evidence, failures, execution order, and run-specific provenance.

The evidence scorecard keeps human flourishing support, system performance,
and learning separate. Full-solution review packets contain the executable
Build, external observations when supplied, and the latest integrated stage
records labeled as generated plans. Later repair proposals receive no credit
as implemented repairs. Historical artifact-only reviews and current
full-solution reviews use distinct scopes and cannot be compared as one scale.
See [the scorecard contract](SCORECARD.md).

Optional outcome simulations remain disabled in the flower default. Their
probabilities and population profiles are illustrative assumptions until
calibrated against observations. They are not additional participants, teams,
learning gains, or evidence of human flourishing.

## Source identity and retained evidence

- `src/data/lifecycle/flower-catalog.json` holds the flower's provenance, shared
  responsibilities, domains, and editable instruction/persona packages.
- `src/data/lifecycle/experiments/flower-baseline.json` is the current default.
  Its explicit `framework` identity remains attached when assignments are
  removed, so zero domain coverage cannot silently withdraw shared duties.
- `src/data/lifecycle/experiment-catalog.json` and `experiments/baseline.json`
  retain the earlier modules and 21-call reference configuration. They are not
  retrospectively relabeled as flower experiments. The Python `legacy_config()`
  helper and legacy regression fixtures exercise those meanings explicitly.
- `tools/lifecycle/experiment_flower.py` defines the five interventions and
  exposes overlap and capacity changes in the matching audit.

Published historical artifacts and saved evidence remain unchanged. Adapting a
runner, producing a dry-run record, and completing a new empirical comparison
are separate activities. Withdrawing instructions cannot erase model knowledge;
case facts, common output fields, and other members can still cue the same
concern. Observed contribution and outcome claims require inspection of the
retained evidence and, for human learning or practice, evaluation with people.

## Verification

```bash
python3 -m unittest discover -s tools/lifecycle/tests -p 'test_flower_experiments.py'
python3 -m unittest discover -s tools/lifecycle/tests -p 'test_*.py'
node tools/lifecycle/tests/test_experiments_gui.mjs
```

The flower tests execute all five arms once, verify all 196 offline calls and
their journals, check preservation of shared responsibilities and controls,
exercise overlapping assignments, and confirm that removed members reduce
capacity. The legacy tests retain their original reference configurations.
