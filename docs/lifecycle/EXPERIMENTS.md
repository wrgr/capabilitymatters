# Configurable Agentic LE experiments

This workbench makes a team's assigned competencies, interaction behaviors, working conditions, and fixed challenges explicit so their effects on simulated work can be examined. It preserves the existing Agentic LE demonstrations and adds a separate experimental execution path.

## Start with the GUI

From the repository root:

```sh
npm install
npm run build
python3 tools/lifecycle/server.py
```

Open `http://127.0.0.1:8767/agentic-le/experiments/`.

1. Start with the fictional example or import a configuration previously exported from this page.
2. Configure the people: names, functional roles, competency assignments, stage participation, authority, availability, and defined interaction behaviors. One actor may hold several competencies, and several actors may share one.
3. Choose the coordinator and either explicit integration or procedural handoff. Keep the same coordinator when comparing integration responsibility.
4. Set environmental constraints and challenges. Each challenge is inserted before contributions at its selected stage, with the same content and timing in every matching condition.
5. Inspect the resolved configuration and coverage. A named competency can be assigned yet unavailable or unscheduled; global omission removes its explicit module from every resolved actor, including the coordinator.
6. Run a dry run to check configuration, event recording, and replay. For model generation, use a locally installed, authenticated Codex CLI, select `codex`, and enter a model identifier. The existing explicit live-mode setting is required:

```sh
CAPABILITY_MATTERS_LIVE=1 python3 tools/lifecycle/server.py
```

The hosted static page can configure, export, and inspect imported records. It cannot start local model calls. Start the local service to execute a configuration. Exporting or replaying a saved record does not invoke a model.

## Trace and replay

Each run retains its original configuration, resolved role contract, instruction-catalog hash, configuration hash, and fixed schedule. Recorded events include stage transitions, fixed challenges, provider requests with prompts, contributions, coordinator decisions, versioned artifacts, completion, and retained failures.

The GUI's replay controls move through this saved history. Inspect the configuration, prompts, responses, source event references, and artifact revisions alongside the selected point in time. A later artifact revision does not replace an earlier event. Executable candidates are displayed inside an isolated frame; loading the frame is a technical inspection, not a learning study.

For a batch, the active row receives its actual run identity and replay link as soon as the journal is created, before the first model call. Open that link to inspect the growing record while the run is active. Final comparison counts and journal-head hashes are recorded when the run stops; the earlier creation-event hash remains available separately.

Export the original run JSON to move the record to another machine or inspect it in the static workbench. Local runs remain under `data/lifecycle/<run-id>/`. Ordinary replay links use `?run=<run-id>&event=<sequence>` while the local runner is available. A recipient needs the exported journal when that local service is unavailable.

Hash verification detects changes relative to the recorded chain and manifest. It does not establish that model claims are true or that a journal has an external timestamp or signature. Keep the source run directory if raw provider receipts are needed.

The named model is the requested provider identifier. It does not by itself prove a service's exact underlying model revision. Each live call retains its provider receipt and metadata for inspection. Model or prompt changes can alter regenerated outputs; replay reproduces the saved record, not a new model response.

The prompt context policy is pinned with the run: the ten most recent public contributions, bounded excerpts of their bodies and current artifacts, and only challenges that have already arrived. Truncated excerpts are explicitly marked. The complete earlier responses, artifacts, and exact assembled prompts remain in the journal.

## The initial comparison

The predefined comparison crosses explicit measurement support with a designated integration responsibility:

| Condition | Explicit measurement support | Coordination instruction |
|---|---|---|
| A | Included | Explicit integration |
| B | Omitted | Explicit integration |
| C | Included | Procedural handoff |
| D | Omitted | Procedural handoff |

Team membership, contribution opportunities, case facts, environment, challenges, provider selection, and call/output limits remain the same. Procedural handoff preserves access to previous contributions while omitting a designated responsibility to reconcile them; spontaneous integration is allowed. The presence cells require measurement support assigned to an available actor with an opportunity to contribute. Other explicit omissions are preserved across all four conditions.

Three repetitions per cell produce 12 fresh executions. These are exploratory repetitions, not a powered study. A single-configuration repetition option is also available. Configuration and catalog hashes bind each planned execution to its inputs. Responses are generated afresh; saved responses are not replayed as new observations.

The existing contribution output schema includes human/system and flourishing fields in every condition. These shared fields remain a residual prompt cue and must be reported when interpreting results. Withdrawing a module does not erase a language model's knowledge, prohibit compensation by another contributor, or establish that a human competency has been removed.

The runtime uses a fixed finite stage schedule. It records requested revisits without silently adding unequal model-call opportunities. Inspect outstanding requests and changed requirements when judging the artifacts; completing the schedule does not establish that every concern was resolved.

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

The provider in the configuration controls whether these are dry runs or live model calls. Live runs require the existing `CAPABILITY_MATTERS_LIVE=1` setting and an explicit model. A maximum-call limit is enforced. The accepted-response character bound is not an output-token or spending cap; it rejects oversized returned responses after generation.

The batch runner continues after a run fails so failures remain visible in the comparison. A failed run and its earlier events are retained. It never silently substitutes a new execution or reuses a response. The CLI returns a nonzero exit status if any run failed or the batch was cancelled. To repeat a completed batch, start a new batch. An interrupted batch remains visibly unfinished; automatic resumption is not implemented.

**Cancel a batch** requests a stop before the next run. The current run may finish before the batch acknowledges that request; cancellation is not an immediate termination of an in-flight model call. If the active run is separately cancelled, its retained journal ends with a cancellation event and the remaining batch items are skipped. The batch does not schedule more runs after acknowledging either form of cancellation. For local automation, create `cancel.requested` inside the batch directory to request the same boundary stop.

Cancelled batches retain all earlier results. Unstarted items are labeled `skipped`, with no invented run identity or output. An actively cancelled run is labeled `cancelled`, separately from a failed run. Comparison counts distinguish completed, failed, cancelled, skipped, pending, and running items. Human review scores remain unfilled; a cancelled or skipped item is not automatically scored as a scientific failure. An unexpected batch orchestration error records a terminal `failed` state and the error, preserves the full plan, and stops further scheduling. Forcefully terminating the process can still leave an unfinished record that requires inspection.

Batch records are stored under `data/lifecycle/batches/<batch-id>/`:

| File | Purpose |
|---|---|
| `manifest.json` | Original configuration, complete planned conditions, hashes, state transitions, and run identities |
| `comparison.json` | Actual execution counts, completion/failure/cancellation states, skipped runs, journal heads, and artifact/event links |
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

A technical output can be inspected directly. Effects on actual learning, human agency or burden, and operational system performance remain hypotheses until observed independently. An unexpected idea is unexpected relative to the predeclared expectations, not automatically novel to the field. Dry-run fixtures provide no ablation evidence at all.

## Scope and remaining interpretation limits

The three foundations remain Human flourishing, Learning sciences, and Systems engineering. The instruction modules map to the project's existing public competency domains and task lenses; they do not replace the framework or establish a credentialing standard. Behavior settings describe bounded simulation instructions, not validated personality measurements.

Use fictional or approved case material. The tool is intended to surface assumptions, overlooked problems, and candidate investigations. It does not measure the competence of named real people or establish that generated teams faithfully reproduce human teams.
