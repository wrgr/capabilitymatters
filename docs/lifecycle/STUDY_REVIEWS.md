# Evidence-only model reviews for the flower study

This standalone workflow reviews completed generated candidates with two fresh
calls to the same model. It keeps all nine raw ratings, their exact evidence
quotations, missing evidence, and reviewer disagreement. It never invokes the
scorecard's Monte Carlo sampler or the runtime outcome simulator. It does not
change historical frozen assessments or their probability model.

## Evidence and preparation

Finish all planned generation runs before preparing the set. Failed, cancelled,
or skipped generation items remain explicit exclusions. A completed candidate
must have its retained executable Build, eight-stage records where available,
and an actual browser-observation record. Observation failures are still useful
records: describe what failed and what remains untested instead of asserting a pass.

The QA directory layout is `<qa-root>/<run-id>/observations.json`. Each file must
contain `source_sha256`, `build_content_hash`, and `observations: [{"text": "..."}]`.
The source and Build hashes must match the exact generated artifact. Optional
`run_id` and `run_head_hash` are also checked when supplied. Only each observation's
`text` enters the masked packet. Do not include conditions, actor assignments,
run IDs, or local paths in that text. Full reports and screenshots remain outside
the scoring packet and can be retained separately as provenance.

Run from the repository root, substituting the recorded batch and output paths:

```sh
python3 tools/lifecycle/study_scorecard.py prepare \
  --runs-root /path/to/study/records \
  --batch /path/to/study/records/batches/BATCH_ID/manifest.json \
  --observations-root /path/to/study/qa/results \
  --output /path/to/study/scoring \
  --scenario feedback-conversation \
  --model gpt-6.1-sol --reasoning-effort low --order-seed 20261102
```

Preparation invokes no model. It pins the code-file hashes, evidence packet
hashes, private assignment manifest, review order, model, and reasoning effort.
The complete output must be a new directory. Each candidate gets two jobs in a
shuffled opaque order. There are at most 15 reviewable candidates and a hard
maximum of **30 reviewer process invocations**. Repeating a run ID cannot create
another candidate. A changed source version or packet stops subsequent processing.

The private assignment key must never be supplied to a reviewer. `E1` is the
exact retained executable Build. Observations follow. Generated stage records
retain the artifact's title/body and selected fields from its linked integrated
decision. They exclude raw messages, assignment metadata, source sequence
references, and additional executable code. Plans and proposed repairs receive
no implementation credit unless supported by the retained Build or actual observations.

## Review execution and retained failures

The existing authenticated Codex CLI is required. A dry command reports the
prepared jobs without invoking it:

```sh
python3 tools/lifecycle/study_scorecard.py review --output /path/to/study/scoring
```

When live review execution is authorized, supply the installed CLI explicitly:

```sh
CAPABILITY_MATTERS_LIVE=1 python3 tools/lifecycle/study_scorecard.py review \
  --output /path/to/study/scoring --codex-executable /path/to/codex --execute
```

Each job uses a fresh empty temporary working directory, an ephemeral context,
a read-only sandbox, a separate strict response schema, and disabled shell,
browser, app, and subagent features. The driver supplies only the masked packet
and review instructions. It retains `request.txt`, `response-schema.json`,
`provider.jsonl`, `provider.stderr.txt`, the original `response.json` when
produced, and a hash-bound `result.json`. Receipt evidence of tool activity,
provider errors, missing turn completion, malformed ratings, or unsupported
quotations rejects the review. The default timeout is 240 seconds per process.
The three specific configuration-notice messages observed in the successful
preflight are retained separately as warnings. Other error items remain failures;
the driver does not broadly ignore receipt errors or modify the raw receipt.

The default is five concurrent reviewer workers; `--workers` accepts one to five.
`dispatch.json` pins submission order and worker count before execution. Jobs are
submitted in the already-shuffled protocol order; their completion order can
differ. Each result independently retains its start and completion timestamps.
Concurrency does not change the maximum of 30 invocations or the two-attempt design.

There is one attempt per job, with no automatic retry, repair, or selection of a
more favorable rating. Resuming reuses a retained result, including a failed
attempt, without calling the model again. An interrupted directory without a
final result stops execution for inspection instead of silently starting another
call. Invalid responses remain unknown in the final aggregation. The 30-call
limit concerns CLI invocations; it is not a provider token, dollar, or runtime cap.

## Freeze, reveal, and descriptive results

```sh
python3 tools/lifecycle/study_scorecard.py aggregate --output /path/to/study/scoring
```

Aggregation first checks and freezes the complete set of retained attempts. It
then reads the private assignment key, writes `summary.json`, and exports
`raw-ratings.csv`. No simulated probability functions are called. A failed
attempt contributes an explicit missing-value marker, never a fabricated model
review or zero rating.

Every non-null criterion score must be within 0–4, have lower and upper bounds
containing it, and cite an exact quotation from an identified packet item. Unknown
criteria remain null, with their reason retained in the original valid review.
An individual review's axis index is 25 times the mean of its three criterion
scores. The candidate mean requires both reviewers to supply all three scores;
otherwise that axis stays unknown. The three axes have no combined total.

The summary reports both reviewers' values, absolute criterion and axis
disagreement, each candidate's indices, condition means and sample standard
deviations, minima/maxima, missing counts, and descriptive differences from the
full-team condition within matching scenario/task/rubric/scope strata. Repeated
reviews do not create additional generated candidates. Two calls to one model
are repeated model judgments, not independent human raters. Three generation
repetitions per condition support a preliminary descriptive comparison, not a
population effect estimate or evidence of human learning, transfer, or flourishing.

## Verification

```sh
python3 -m unittest discover -s tools/lifecycle/tests -p 'test_study_scorecard.py' -v
python3 -m unittest discover -s tools/lifecycle/tests -p 'test_scorecard_solution.py' -v
```

These tests use offline journals and mocked reviewer processes. They verify
source-bound evidence, retained stage content, masking, empty working directories,
the 30-invocation bound, no repeat calls on resume, quotation and tool-use rejection,
unknown-value propagation, descriptive disagreement, and no probability sampling.
