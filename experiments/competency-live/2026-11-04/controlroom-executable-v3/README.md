# Executed control-room deployment: accepted implementation

This directory retains eight actual discrete-event software executions of the
unchanged frozen control-room intervention: three primary conditions and five
explicit diagnostic probes. These are observed software-state transitions under
authored, uncalibrated environment and actor assumptions. They are not written
model projections, human observations, or additional design-agent conversations.

## Primary observations

- **Easy:** practice starts at virtual second 180, the actor detects the mismatch
  and stops at 184, its acceptance attempt is suppressed, and the safety recipient
  acknowledges a complete handoff at 785. The packet contains the actual last-known
  value `9` labeled uncertain, timestamp `90`, discrepancy and stopped status.
  Required participant-owned console records and the final two-minute recording
  segment complete. No stale item enters the processing queue.
- **Medium:** the ranking-first actor accepts one stale item at 186 before checking
  and stopping at 192. Acknowledgement and required records complete, but the later
  stop does not erase that earlier error. The deployment obligation fails.
- **Hard:** actual known out-of-scope faults fail the release gate and practice
  never starts. Release compliance succeeds; the demanded combined-failure
  capability is not delivered or assessed.

All times are virtual seconds from the beginning of the existing 20-minute slot,
not measured human response times. The seven-unit budget and original artifact
SHA-256 `9ea47a59d515e9ca1cf22611fc6c2e6d440ce8aadf561432b9d74d4031a8ee96`
remain unchanged. No resource, lesson, diagnosis assessment, delayed probe, radio
rehearsal, fallback, expert or retry protocol was added to the intervention.

## Diagnostic probes

`medium_cue_first.json` changes only the actor response profile in the same medium
environment: no stale acceptance occurs. This exposes an assumption-sensitive cue
use requirement; it does not estimate a training effect. `hard_after_start.json`
starts in the permitted script, stops at 184 for the existing contradiction, and
loses the radio channel at 190. Its one scheduled handoff at 780 is dropped, and no
acknowledgement or invented retry appears when the channel returns at 1085. It is
a communication-loss-after-stop probe, not a demonstration of detecting or
resolving newly emerging compound faults.

`missing_reference.json` fails an actual pre-start reference check.
`recipient_unavailable.json` transmits but cannot obtain acknowledgement.
`fresh_sensor_control.json` accepts a current record after checking instead of
rewarding a controller that always stops. Diagnostic probes are not replications
of people, new professional teams, or a factorial study.

## Reproduction and interpretation

From the repository root, rerun the exact retained implementation and model into
a new output directory:

```sh
python3 experiments/competency-live/2026-11-04/controlroom-executable-v3/implementation/run_controlroom_deployment.py --model experiments/competency-live/2026-11-04/controlroom-executable-v3/model.json --out /tmp/controlroom-replay-new
```

Choose an unused output path. The CLI refuses to overwrite a retained run. Current
source has the same functionality under `tools/lifecycle/run_controlroom_deployment.py`.
Environment-model schema v2 and adapter implementation v3 are versioned separately.
The model was instantiated retrospectively after the design and initial projections;
only the original intervention and event descriptions were held fixed in advance.

`execution-receipt.json` pins code/model hashes before episode execution.
`implementation/` and `model.json` preserve those exact inputs. Each episode
contains its full input, before/after state transitions, virtual time, meaningful
participant-owned console records, independent world-oracle checks and a hash
chain. `summary.json` contains derived outcomes. `competency-dependencies.json`
connects functional requirements to trace witnesses. The observer rejects altered
traces; difficulty labels do not choose outcomes.

`independent-audit.json` reports a scoped pass for the eight retained inputs and
tested counterexamples, not a general correctness proof or physical calibration.
Use the **full outcomes and trace**. The descriptive `terminal_state` label can be
misleading on some perturbed paths, and the participant's local `unmet_criteria`
subset is not an exhaustive independent success verdict. Neither overrides the
observer's stale acceptance, protocol, scope, record and delivery predicates.
These nonblocking limits are retained in the independent audit.

The earlier v1 and v2 execution directories preserve failed/conditional validation,
exact implementations, inputs, results and audits. They are development evidence,
not pooled with the accepted analytic results. The original generated dialogue,
intervention and written projections remain intact in the sibling `controlroom/`
archive. The software-auditor context is separate from the original design-team
study and its conversation count.

The functional requirements identified here could be covered by a qualified,
appropriately authorized individual or distributed across a team. No matched
individual design, human competency measurement or team-superiority experiment
was conducted. Independent diagnosis and delayed transfer remain **unassessed**.
