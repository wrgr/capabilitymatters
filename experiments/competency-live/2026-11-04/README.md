# Authenticated competency-mediation examples

This archive retains actual native Codex subagent executions on fictional organizational cases. It contains no human participant data. `protocol.json` is the initial pilot protocol; `protocol-v2.json` adds explicit knowledge/authority permissions and readable instructions retained before dispatch.

## Completed examples

The [execution summary](summary.json) records **16 actual subagent conversations,
36 completed task turns, and 28 public design utterances** across four team
episodes, including four independent reviewers. Three accepted examples provide
nine stress applications. The initial failed logistics pilot and its three
applications are retained separately. All native runtime model labels are
`gpt-6.1-sol`, high reasoning effort. No smaller-model comparison was run.

- [Logistics dialogue](transcripts/logistics-gated.md): nine of ten units committed;
  denominator auditing and actual learning-science advice change the plan, while
  missing coverage and scheduling keep release withheld.
- [Benefits dialogue](transcripts/benefits.md): nine of nine units committed;
  assistance wins a budget tradeoff with wording changes, policy signoff remains
  narrow, and unstaffed review/access gaps prevent release.
- [Control-room dialogue](transcripts/controlroom.md): seven of eight units
  committed; a fault rehearsal replaces dedicated unranked practice. The dual
  endorsement permits only a conditional simulator exercise with explicit start
  and stop gates, not readiness certification.
- [Initial failed pilot](transcripts/logistics.md): seven units committed and no
  release; the reviewer failed auditability/artifact completeness. Its record is
  evidence of failure, not another accepted example.

All three accepted examples pass bounded **process feasibility**, not intervention
success. Actual operational and learning outcomes remain unobserved. Full
independent findings, minor artifact ambiguities, the control-room validator
rejection/amendment, and tool failures remain in each case's failure ledger. The
[pilot checkpoint](pilot-validation.json) precedes the first benefits and
control-room launches. Final software checks passed [214 Python tests and 12 Node
tests](validation/software-validation-final.json), plus ten gate/export tests in
normal and optimized Python.

The unit of design is a team episode. Each episode has two core professional roles, an optional consultant invited only after a participant request, and a fresh independent model reviewer. A deployment task applies one immutable plan independently to three stress conditions. Task turns are not provider API-call counts: tool use may involve multiple internal model continuations.

## What is controlled

Participants start with separate conversation histories (`fork_turns=none`). Each receives only its own role packet, plus explicitly delivered public messages. The role packet distinguishes assigned competencies, excluded specialist scopes, organizational evidence, authority, availability, budget, and reference costs.

The version-2 acceptance gate checks claim-scope labels, allowed evidence citations, prior message delivery, public evidence disclosure, action-owner authority scopes, exact core endorsements, resource arithmetic, and contribution references. It rejects violations without generating dialogue or choosing a better intervention. An independent reviewer checks whether the language actually respects those declarations. Correct labels alone are not evidence of correct expertise.

These are evidence and authority gates, **not erasure of pretrained knowledge or hard per-agent filesystem isolation**. The native subagents share the workspace. Actual observed file/tool access is retained for audit. Hypotheses cannot establish organizational facts, invent resources, confer certification, or supply another professional's approval.

## Reading a case

1. Read `spec.json` for the researcher/auditor view and `packet-ROLE.json` for what each role was supplied. The specification and sealed events are not delivered to design agents.
2. Follow `invocations/` and the complete `responses/` files. `public_inputs` identifies exact colleague responses delivered at each stage. Scope and evidence fields accompany natural professional speech.
3. Compare `draft-intervention.json`, each core endorsement, `frozen-intervention.json`, and `freeze-receipt.json`. Sidecar endorsements bind exact bytes; the frozen draft is never rewritten to incorporate later wording.
4. Read `deployment-release.json` and `deployment.json` for independent applications of the same plan to easy, medium, and hard events. They contain model-reasoned projections, not empirical operational measurements.
5. Read `evaluation.json` and `failures.json`, including disagreements, semantic expertise findings, and unknown outcomes. Integrity verification and an independent feasibility gate are different judgments.
6. Inspect `runtime-transcripts/*-rollout.json` and native launch receipts for real agent IDs, actual tools and outputs, public replies, and runtime model labels/effort. Private reasoning, internal runtime instructions, and account passthrough identifiers are excluded from export.

Native inter-agent message envelopes are encrypted in local logs. The original pilot therefore failed its auditability gate. Version 2 stores substantive instructions in readable files **before dispatch**, and the agent's actual file read is observable in its tool record. Encrypted bootstrap envelopes remain a disclosed limitation; their contents are not reconstructed as native plaintext. Public messages and consulted evidence remain fully retained.

Raw runtime JSON exports are retained as complete per-agent evidence units and
can exceed ordinary source-file length conventions. The smaller response files
and readable dialogue exports provide convenient reading units. Source modules
remain below the repository's file and function length limits.

## Reproduction and verification

No API key, GitHub Actions job, or scripted participant policy is used to produce the live conversations. Phase instructions are transport scaffolding; generated speech, resource decisions, disagreements, and endorsements belong to the actual subagents. The earlier API-backed adapter and deterministic policy fixtures are retained elsewhere and were not used for these examples.

Native collaboration must be launched in an authenticated interactive environment with isolated conversation histories. The repository's Python tools operate only on retained evidence; they cannot replay a language-model conversation deterministically or launch the native collaboration service from a shell.

Run software checks from the repository root:

```sh
python3 -m unittest discover -s tools/lifecycle/tests -p 'test_*mediation*.py'
python3 -O -m unittest discover -s tools/lifecycle/tests -p 'test_*mediation*.py'
node --test tools/lifecycle/tests/competency_casebook.test.mjs tools/lifecycle/tests/competency_pilot.test.mjs tools/lifecycle/tests/live_competency_agents.test.mjs
```

For a new episode, `authenticated_mediation.py register FOLDER ACTOR AGENT_PATH` retains the actual returned identity. `freeze FOLDER DRAFT ENDORSEMENT_A ENDORSEMENT_B` checks and seals exact bytes; `reveal FOLDER` releases the already authored events. `verify FOLDER` writes a new integrity inventory and refuses to overwrite an existing receipt. Failed operations are retained in `technical-failures/` and are not automatically repaired. Do not use original example folders as scratch space.

`export_mediation_transcript.py FOLDER ACTOR LOCAL_ROLLOUT_PATH` exports only public records from one explicitly selected local subagent rollout. It preserves the native source digest and runtime model/effort. Keep local account information and private reasoning out of public research exports. Record fresh invocation instructions before dispatch and retain all rejected proposals and failed executions.

`verification.json` is a checkpoint, not proof of professional expertise, ecological realism, causal mediation, or educational effectiveness. Final inventories must be created after all evidence exports; earlier checkpoints remain historical. Exact tests and known technical failures are recorded separately from model-process failures.

## Evidence classes

Authenticated model episodes in this directory contain actual generated conversations and choices. Their event consequences are hypothetical model projections. The older `data/lifecycle/competency-casebook/observations-v1.json` is an authored policy fixture with **zero live model calls**, 36 programmed designs, and 108 authored surrogate observations. Neither is the historical dynamic-flower dataset. Counts and claims must remain separate.

The manuscript at `docs/lifecycle/competency-mediation-paper-v3.md` explains the instrument and findings. Execution and tooling details belong in this archive rather than its scholarly narrative. No outcome is a measurement of a worker, claimant, utility, learner, or real organization.
