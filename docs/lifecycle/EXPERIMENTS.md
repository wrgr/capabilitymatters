# Configurable Agentic LE experiments

The current default uses the learning engineering flower and five responsibility/capacity comparisons. Start with [Experiments using the learning engineering flower](FLOWER_EXPERIMENTS.md). The earlier module presets and 21-call matrix below remain available as explicitly retained legacy configurations.

This workbench makes a team's assigned competencies, interaction behaviors, working conditions, and fixed challenges explicit so their effects on simulated work can be examined. It preserves the existing Agentic LE demonstrations and adds a separate experimental execution path.

## Start with the GUI

From the repository root:

```sh
npm ci
npm run build
python3 tools/lifecycle/server.py
```

Open `http://127.0.0.1:8767/agentic-le/experiments/`.

1. Start with the fictional example or import a configuration previously exported from this page.
2. Choose Default team, Competency ablation, or Individual agent, then apply the arrangement. Choose named competency personas or edit names, functional roles, competency assignments, stage participation, authority, availability, and interaction behaviors. One actor may hold several competencies, and several actors may share one.
3. Choose the coordinator and either explicit integration or procedural handoff. Keep the same coordinator when comparing integration responsibility.
4. Set environmental constraints, outcome-model assumptions, and challenges. Each challenge is inserted before contributions at its selected stage. A challenge may also replace specified simulation conditions when it arrives.
5. Inspect the resolved configuration and coverage. A named competency can be assigned yet unavailable or unscheduled; global omission removes its explicit module from every resolved actor, including the coordinator.
6. Run a dry run to check configuration, event recording, and replay. For model generation, use a locally installed, authenticated Codex CLI, select `codex`, and enter a model identifier. The existing explicit live-mode setting is required:

```sh
CAPABILITY_MATTERS_LIVE=1 python3 tools/lifecycle/server.py
```

The hosted static page can configure, export, and inspect imported records. It cannot start local model calls. Start the local service to execute a configuration. Exporting or replaying a saved record does not invoke a model.

## Three scenarios and independent scorecards

The Configure tab includes feedback conversations, scientific-evidence reasoning, and public-library digital access. Apply a scenario to replace the brief, environment, fixed challenges, and initial legacy simulation conditions while preserving the team, provider, call schedule, and comparison. Each case has explicit learner targets, affected-person constraints, functional requirements, evidence anchors, and a versioned hypothetical population mixture.

Before generating candidates, choose **One run** or **Configured comparison**, set the scorecard assumptions, and save an iteration. The snapshot pins the complete configuration, scenario reference, comparison, assumptions, and a change note. Editing these inputs requires a new immutable fork for a fresh execution to carry its iteration ID. Single runs and comparison batches have distinct saved plans. Original execution journals are linked through sidecars and remain unchanged.

The scorecard workflow is:

1. Generate candidates under the saved iteration. A dry run verifies transport and replay; it supplies no experimental result.
2. In **Scorecard**, select the completed or stopped runs and their case, then prepare an assessment set. The first preparation fixes its candidate membership and assumptions. Repeating the exact request recovers the same set; it does not generate new review IDs.
3. Export the **opaque packet bundle** for the assessor and keep the **private assignment key** separately. The blind workspace accepts the task, candidate artifact, rubric, and pinned assumptions. It has no source-run or assignment loaders. A sandboxed preview supports inspection, while the source and evidence hashes remain accessible.
4. Rate nine criteria with uncertainty bounds, rationale, and exact evidence anchors. Unknown evidence remains unknown. Freeze every review, including explicitly incomplete reviews, before revealing the complete original assessment set. Ratings and probability assumptions cannot be changed after freeze.
5. Load the frozen records in the organizer, reveal the assignment key, and compare matching candidates. Records retain the packet, ratings, settings, conditional samples, hashes, and original-run links. New packets cannot make an already revealed source artifact blind again.

Human flourishing, system performance, and learning remain separate. The first axis means task-level support for flourishing; the third concerns learning design and evidence. The sampler reports a modeled range, gated threshold probability, criterion-floor failure, individual pass fraction, and joint all-axis probability. Comparison reports probabilities of a meaningful gain, loss, or difference within a chosen margin. None establishes actual human learning or wellbeing.

Person and context sensitivity, reviewer uncertainty, optional residual team sensitivity, and observed spread across fresh generated candidates are distinct. The latter is reported only after reveal, within the same task, scenario, settings, model, condition, and iteration. More Monte Carlo draws improve computational precision without adding participants or generated teams. The [scorecard method](SCORECARD.md) documents the implemented model. The [earlier study plan](SCORECARD_STUDY.md) is retained as design provenance. The supplied paper reports a separate completed eighteen-run historical exploration; that record is not evidence from the new flower preset, whose live scored study remains unrun.

Assignment masking is procedural. Someone who generated the candidates is not made blind by hiding their IDs, and the artifact itself may contain identity clues. Use an independent reviewer or a fresh scoring context without the private key. Imported content hashes establish consistency, not independent authenticity. The local runner can certify its own freeze/reveal sequence only; an imported frozen file remains inspectable but cannot establish prior local freezing.

## Current flower preset

The current default has eight flower domains, shared understanding at the center, and learner/stakeholder responsibilities across every member. It schedules 32 contributions and eight decisions (40 calls). Its five-way comparison distinguishes full team, global domain omission, single-member withdrawal, member removal, and one individual with matched slots. See [the complete flower protocol](FLOWER_EXPERIMENTS.md) for controls, overlap, call counts, and interpretation. Flower instruction packages have no crosswalk to the separate legacy taxonomy.

## Retained legacy arrangements and competency personas

| Arrangement | What changes | What stays available for inspection |
|---|---|---|
| Default team | Restores the supplied roster, integration policy, omissions, and team participation mode | The current case, execution settings, environment, challenges, and outcome settings are preserved |
| Competency ablation | Omits the selected instruction module globally and selects team participation | Current actors and stages remain; other explicit omissions are preserved |
| Individual agent | One selected persona performs every contribution and coordination slot | The reference team's ordered opportunities, effective slot duties, case, conditions, and limits remain explicit |

An arrangement prepares a configuration. The comparison selector then chooses whether to repeat it, compare retained versus omitted support, add a coordinator-reinforced condition, or compare a team with its selected individual. For a legacy configuration, the generalized competency selectors accept any of the seven original modules. They refuse a presence condition without an available, scheduled contribution carrying that module.

The retained legacy catalog provides seven module-specific personas, an all-competency generalist, and three combinations: Learning and interaction designer, Implementation and evidence contributor, and Human and systems contributor. Applying a persona copies its competency selections and requested behavior. It retains the actor's identity, name, role, authority, availability, and existing stages; recommended stages in the catalog are guidance, not an automatic rescheduling operation. The materialized selections are editable. A persona reference records the preset's identity and version, not hidden inherited duties or verified expertise.

Individual mode separates **identity** from **scheduled duty**. The legacy reference team has 13 contribution slots and eight coordination decisions, for 21 calls. The generalist individual performs those same 21 slots as one actor, including the decisions. A slot receives the same competency duties at the same stage as the corresponding team slot. The individual does not receive every module on every call, and there is no second, hidden coordinating actor.

Selecting a specialist individual intersects its selected modules with each reference slot's modules. Slots with no remaining module still execute, making the reduced explicit support visible without reducing the call opportunities. This is a different comparison from the all-competency individual. The matching audit reports altered competency exposure. The individual's single requested behavior applies throughout; if the source team has heterogeneous behaviors, the audit also identifies the resulting behavior changes. These are models executing assigned task perspectives, not validated models of one human's workload or multidisciplinary proficiency.

Version 1 configurations remain accepted with their original normalized fields and canonical configuration hashes. Choosing a new study arrangement explicitly upgrades a legacy configuration to version 2, adding persona references, the participation configuration, and outcome settings. Existing version 1 journals retain their original response format and replay behavior. Version 2 individual IDs must differ from reference-team IDs so persona edits have an unambiguous target.

## Standardized agent execution contract

Every resolved run pins a versioned `agent-turn` contract and a specification for each effective profile. The specification records identity, purpose, selected competencies and resolved duties, behavior, authority, requested tools, stages, turn kinds, context policy, stopping conditions, and hashes. The common typed signature takes a case brief, stage, effective instructions, and visible context and returns a contribution or decision, evidence references, an artifact, and, on the version 2 Build decision, a typed design declaration.

The contract uses explicit input and output schemas. Runtime validation rejects malformed outputs, future evidence references, an absent Build declaration, and executable source on the wrong turn. Persona titles, source-person identities, condition labels, and human-review predictions remain audit metadata rather than extra model instructions. The same interface is used in every experimental condition; its human/system fields and declared-design fields remain common cues that must be considered when interpreting an ablation.

This is an application execution contract informed by typed signatures, schema validation, and agent-description practices. It does not claim A2A protocol compliance, cryptographic actor authentication, or demonstrated human competence. Its source links are retained in the pinned contract. A hash establishes consistency with recorded content; it does not authenticate a real person or establish the truth of a model's statements.

The design draws on [DSPy typed signatures](https://dspy.ai/3.1.3/learn/programming/signatures/), [JSON Schema object contracts](https://json-schema.org/understanding-json-schema/reference/object), [A2A identity and capability descriptions](https://a2a-protocol.org/latest/specification/), and [independent agent outcome evaluation](https://www.anthropic.com/research/demystifying-evals-for-ai-agents). The requested tool set is empty. Instructions request no tool use, while the CLI filesystem sandbox is read-only; this does not certify that the provider invoked no read-only tools. Raw provider receipts remain available for inspection.

Historical typed responses are checked against the output schema pinned in their own run, so later required fields are not silently imposed on old records. When integral numeric representations are normalized for portable JSON hashes, the original parsed-value representation and its hash are retained. Malformed nonfinite provider output is rejected and preserved as text without invalidating the failure journal's JSON.

## Trace and replay

Each run retains its original configuration, resolved role contract, instruction-catalog hash, configuration hash, ordered execution plan, standardized agent specifications, and outcome-model definition. Recorded events include stage transitions, fixed challenges, provider requests with typed inputs and exact prompts, contributions, coordination decisions, versioned artifacts, illustrative outcome assessments, completion, and retained failures.

The GUI's replay controls move through this saved history. Inspect the configuration, prompts, responses, source event references, and artifact revisions alongside the selected point in time. A later artifact revision does not replace an earlier event. Executable candidates are displayed inside an isolated frame; loading the frame is a technical inspection, not a learning study.

For a batch, the active row receives its actual run identity and replay link as soon as the journal is created, before the first model call. Open that link to inspect the growing record while the run is active. Final comparison counts and journal-head hashes are recorded when the run stops; the earlier creation-event hash remains available separately.

Export the original run JSON to move the record to another machine or inspect it in the static workbench. Local runs remain under `data/lifecycle/<run-id>/`. Ordinary replay links use `?run=<run-id>&event=<sequence>` while the local runner is available. A recipient needs the exported journal when that local service is unavailable.

Hash verification detects changes relative to the recorded chain and manifest. It does not establish that model claims are true or that a journal has an external timestamp or signature. Keep the source run directory if raw provider receipts are needed.

The named model is the requested provider identifier. It does not by itself prove a service's exact underlying model revision. Each live call retains its provider receipt and metadata for inspection. Model or prompt changes can alter regenerated outputs; replay reproduces the saved record, not a new model response.

The prompt context policy is pinned with the run: the ten most recent public contributions, bounded excerpts of their bodies and current artifacts, only challenges that have already arrived, and simulation assessments that have already been recorded. Truncated excerpts are explicitly marked. The complete earlier responses, artifacts, and exact assembled prompts remain in the journal.

## Comparisons and matching

The generalized planner accepts a comparison specification separately from the configuration:

```json
{
  "schema_version": 1,
  "kind": "ablation",
  "competency": "human",
  "integration_modes": ["explicit"]
}
```

`configured` repeats the current configuration for each selected integration mode. `ablation` creates retained and omitted conditions for the selected competency. `competency_emphasis` adds a third, coordinator-reinforced condition. `team_individual` creates team and individual conditions using the selected individual persona. `competency` selects a catalog module for ablation or emphasis and must be `null` otherwise. A single integration mode is useful when studying one factor first.

### Learning and practice emphasis

In Review & run, choose **Included, omitted, coordinator reinforced** and **Learning and practice**. Keep one coordination condition for a three-condition study. This comparison uses the existing configuration fields and leaves the source configuration unchanged:

```json
{
  "schema_version": 1,
  "kind": "competency_emphasis",
  "competency": "learning",
  "integration_modes": ["explicit"]
}
```

| Condition | Instruction change | Exposure in the legacy 21-call schedule |
|---|---|---|
| Retained | Restore the selected module at its configured assignments | Two contributor turns, at Design and Refine |
| Omitted | Withdraw the selected module from every resolved actor | Zero turns carrying the module |
| Reinforced | Retain those assignments and also give the same module to the coordinator | Ten turns: the two contributor turns plus eight coordinator decisions |

The exact module duties are: “Describe what the learner should become able to do in the supplied situation” and “Design meaningful practice decisions with feedback and an opportunity to revise an approach.” Interaction design remains a separate module, and participation, access, agency, and burden remain in Human agency and burden. This example therefore tests learning-and-practice instruction placement and exposure, not every aspect of learner-centered design.

The roster, actor identities, stages, behavior, authority, case, challenges, execution settings, and outcome model stay fixed. Other omissions are preserved. Reinforcement adds no calls and changes no scoring coefficients or success thresholds. Prompt length and token consumption are not matched; repeating the module at integration decisions is the intended intervention. This treatment does not separately identify effects of placement, repetition, or prompt length. Assigned emphasis does not establish proficiency, and any result would concern model-generated work under this operationalization.

The comparison requires team participation and a coordinator who does not already hold the selected module; otherwise it refuses a misleading no-op condition. The coordinator's preset reference is cleared when its explicit module bundle changes. It does not add modules to other contributors or silently upgrade a version-one configuration. Existing configurations, the original matrix, and saved journals retain their behavior.

This selector was added after the frozen measurement-by-integration pilot. Its planning, fixed-factor audit, and dry-run GUI path are implementation checks, not new empirical results. Useful prospective observations include objective–practice alignment, whether feedback responds to a learner decision, revision opportunities, coherence between the design declaration and working interface, and any burden or access tradeoff. Keep the observation rubric fixed across conditions and review actual artifacts; the narrow synthetic calculator cannot establish learning effectiveness.

Every planned item carries a matching audit against the first item. It compares ordered opportunities, effective competency exposure, behavior, authority, model-facing profiles, case, environment, challenges, outcome settings, provider and limits, integration, actor identity, and execution-contract and outcome-model hashes. Some differences are intentional experimental factors; the audit makes them inspectable rather than declaring every contrast equivalent. Equal calls and accepted-character bounds do not establish equal token consumption, elapsed time, or human workload.

The original predefined comparison remains available through the legacy matrix interface. It crosses explicit measurement support with a designated integration responsibility:

| Condition | Explicit measurement support | Coordination instruction |
|---|---|---|
| A | Included | Explicit integration |
| B | Omitted | Explicit integration |
| C | Included | Procedural handoff |
| D | Omitted | Procedural handoff |

Team membership, contribution opportunities, case facts, environment, challenges, provider selection, and call/output limits remain the same. Procedural handoff preserves access to previous contributions while omitting a designated responsibility to reconcile them; spontaneous integration is allowed. The presence cells require measurement support assigned to an available actor with an opportunity to contribute. Other explicit omissions are preserved across all four conditions.

Three repetitions per cell produce 12 fresh executions. The legacy full-cycle plan has 21 calls per execution, or 252 planned calls for this matrix. These are exploratory repetitions, not a powered study. A single-configuration repetition option is also available. Configuration, catalog, plan, agent-contract, agent-specification, and outcome-model hashes bind each planned execution to its inputs. Responses are generated afresh; saved responses are not replayed as new observations.

Repetitions are interleaved deterministically: A1, B1, C1, D1, then A2, B2, C2, D2. The order and its policy are recorded. This avoids finishing every repetition of one condition before beginning the next, but it is not randomization and does not eliminate provider drift or order effects.

The existing contribution output schema includes human/system and flourishing fields in every condition. These shared fields remain a residual prompt cue and must be reported when interpreting results. Withdrawing a module does not erase a language model's knowledge, prohibit compensation by another contributor, or establish that a human competency has been removed.

The runtime uses a fixed finite stage schedule. It records requested revisits without silently adding unequal model-call opportunities. Inspect outstanding requests and changed requirements when judging the artifacts; completing the schedule does not establish that every concern was resolved.

## Simulated success and failure

Version 2 adds an explicit, illustrative outcome model. The Build decision declares practice minutes, feedback type, revision opportunity, support minutes per learner, offline fallback, preserved choice, and personal-data handling. A separate evaluator applies the recorded conditions, assumptions, thresholds, synthetic cohort size, and random seed. It does not read persona names, competency selections, or ablation labels to decide whether a condition succeeds.

The declaration also records `model_applicability` and `scope_rationale`. A proposal involving workflow redesign, another mechanism, or a novel approach outside the practice/support model can be marked `outside_scope` with an explanation. It receives **indeterminate**, with the source evidence and an explicit agent claim awaiting human review. The simulator does not sample or award a success/failure score in that case. The declaration does not prove that the approach is valid or out of scope; a reviewer decides whether another model or additional checks are needed.

The model checks three dimensions separately:

| Dimension | Illustrative calculation or check |
|---|---|
| Learner | Success across the full synthetic cohort, including non-completers, using assumed practice, feedback, revision, and transfer relationships |
| Human | Requested practice fits available time; practice plus support burden meets its limit; choice is preserved; identified personal data are not requested |
| System | Synthetic completion meets its threshold under digital access, offline fallback, and total support-capacity assumptions |

Overall status is `success` when all three dimensions pass, `failure` when none pass, and `partial` otherwise. A missing declared design or disabled outcome model is `indeterminate`. These results are independent of execution status: a completed run can have a simulated failure, and a failed or cancelled execution can retain an earlier assessment. Human review scores remain separate and unfilled.

Initial-condition presets cover adequate conditions, limited practice time, and limited digital access. Each has explicit numerical settings; none guarantees a particular result. A challenge's optional `simulation_effects` changes only specified conditions once that challenge arrives. **The default Design challenge replaces available practice time with five minutes.** Selecting an initial twenty-minute preset does not remove this later override. Change or remove the challenge effect when exploring a world where protected time remains available.

The model's assumptions and criteria are pinned independently of the competency manipulation and are preserved across batch conditions. Thresholds and coefficients are editable assumptions, not estimates from learner data. Numeric inputs permit four decimal places; reported metrics and threshold checks use the declared four-place precision. The seeded sampler consumes the same two draws per synthetic person across comparable assessments, so changes in design or conditions can be explored without changing the random stream. This numerical reproducibility is not empirical validation.

Assessments cite the retained Build decision and its artifact, identify applied challenge effects, and retain the evaluator, formulas, model hash, parameters, and limits. After an assessment occurs, later turns may inspect that recorded simulation feedback. The fixed schedule does not silently rebuild the candidate in response; a late revision remains a recorded proposal unless a separate iteration is run.

The evaluator checks the **declared design**, not whether the generated HTML implements those declarations. Inspect the actual candidate and record technical evidence separately. Dry-run designs are authored fixtures; their simulated results test the calculation and replay path. An individual generated result does not establish that a competency caused a difference. Comparative live runs still require analysis of the manipulation and resulting work. No generated run observes actual learner success, human wellbeing, or operational system performance.

## Batch CLI

Export a configuration from the GUI as `experiment.json`. Inspect a plan without creating runs:

```sh
python3 tools/lifecycle/experiment_batch.py --config experiment.json --plan
```

Execute the four-condition comparison:

```sh
python3 tools/lifecycle/experiment_batch.py --config experiment.json
```

Repeat only the supplied configuration:

```sh
python3 tools/lifecycle/experiment_batch.py --config experiment.json --single
```

Inspect an ablation of any selected module, keeping one integration policy:

```sh
python3 tools/lifecycle/experiment_batch.py --config experiment.json --comparison ablation --competency human --integration-mode explicit --plan
```

Inspect retained, omitted, and coordinator-reinforced learning-and-practice conditions:

```sh
python3 tools/lifecycle/experiment_batch.py --config experiment.json --comparison competency_emphasis --competency learning --integration-mode explicit --plan
```

Compare the team with the individual persona configured in the exported file:

```sh
python3 tools/lifecycle/experiment_batch.py --config experiment.json --comparison team_individual --integration-mode explicit
```

Repeat `--integration-mode` with `handoff` to include both integration conditions. Omit `--plan` to execute an inspected plan. `--single` and `--comparison` are mutually exclusive. Without either option, the original measurement-by-integration matrix is used.

The provider in the configuration controls whether these are dry runs or live model calls. Live runs require the existing `CAPABILITY_MATTERS_LIVE=1` setting and an explicit model. A maximum-call limit is enforced. The accepted-response character bound is not an output-token or spending cap; it rejects oversized returned responses after generation.

The batch runner continues after a run fails so failures remain visible in the comparison. A failed run and its earlier events are retained. It never silently substitutes a new execution or reuses a response. The CLI returns a nonzero exit status if any run failed or the batch was cancelled. To repeat a completed batch, start a new batch. An interrupted batch remains visibly unfinished; automatic resumption is not implemented.

**Cancel a batch** requests a stop before the next run. The current run may finish before the batch acknowledges that request; cancellation is not an immediate termination of an in-flight model call. If the active run is separately cancelled, its retained journal ends with a cancellation event and the remaining batch items are skipped. The batch does not schedule more runs after acknowledging either form of cancellation. For local automation, create `cancel.requested` inside the batch directory to request the same boundary stop.

Cancelled batches retain all earlier results. Unstarted items are labeled `skipped`, with no invented run identity or output. An actively cancelled run is labeled `cancelled`, separately from a failed run. Comparison counts distinguish completed, failed, cancelled, skipped, pending, and running items. Human review scores remain unfilled; a cancelled or skipped item is not automatically scored as a scientific failure. An unexpected batch orchestration error records a terminal `failed` state and the error, preserves the full plan, and stops further scheduling. Forcefully terminating the process can still leave an unfinished record that requires inspection.

Batch records are stored under `data/lifecycle/batches/<batch-id>/`:

| File | Purpose |
|---|---|
| `manifest.json` | Original configuration, comparison selector, complete conditions, matching audits, execution order, hashes, state transitions, and run identities |
| `comparison.json` | Execution counts and states, matching audits, latest retained illustrative outcome summaries, journal heads, and artifact/event links |
| `review.json` | Separate, initially unscored human review scaffold |

Run journals remain directly under `data/lifecycle/<run-id>/` so normal replay and run lookup work. Comparison paths are relative to their batch directory.

## Human expectations and assessment

Store expected gaps before execution in a separate JSON array of statements:

```json
[
  "Without explicit measurement support, the design may substitute completion for evidence of capability.",
  "A concern may appear in discussion without influencing the implemented artifact."
]
```

Pass that file separately:

```sh
python3 tools/lifecycle/experiment_batch.py --config experiment.json --expectations expectations.json
```

These statements are retained in the batch and human review record. They are never included in the runtime configuration or agent prompts. Later observations should remain labeled as later observations rather than being retroactively presented as predictions.

The review scaffold keeps learner, human, and system dimensions separate. It also provides space for expected-gap observations, compensating contributions, unexpected ideas, and limitations. Its rubric is:

| Score | Evidence interpretation |
|---|---|
| 0 | Absent, contradicted, or unsupported in the inspected work |
| 1 | Recognized, without a defensible decision or requirement |
| 2 | Incorporated into a justified decision or requirement with an evidence plan |
| 3 | Implemented and checked, with limits stated |

No scores are filled automatically. A score requires a named human reviewer, a rationale, and a retained event citation. Event references include `run_id`, `event_seq`, and `event_hash`; artifact citations also include the exact `artifact_hash`. The `experiment_review.validate_review` function checks these against verified journals and the batch's retained heads.

A technical output can be inspected directly. The human rubric assesses the evidence carried into decisions and implementation; it is not an automatic learner-success score. Effects on actual learning, human agency or burden, and operational system performance remain hypotheses until observed independently. An unexpected idea is unexpected relative to the predeclared expectations, not automatically novel to the field. Dry-run fixtures provide no ablation evidence at all.

## Scope and remaining interpretation limits

The three foundations remain Human flourishing, Learning sciences, and Systems engineering. Only the retained legacy modules refer to the project's earlier competency domains and task lenses. The current flower domains remain separate, without a crosswalk or a claim to establish a credentialing standard. Behavior settings describe bounded simulation instructions, not validated personality measurements.

Use fictional or approved case material. The tool is intended to surface assumptions, overlooked problems, and candidate investigations. It does not measure the competence of named real people or establish that generated teams faithfully reproduce human teams.
