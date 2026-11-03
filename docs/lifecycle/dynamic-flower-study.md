# Dynamic conversations using the learning engineering flower

This protocol specifies a small, editable study of learning-resource design through dynamic team conversations, with source-bound deployment tests and separate evaluation of the process and its result.

**Status:** executable protocol for catalog version `dynamic-flower-1`, which contains two cases, five selectable configurations, and six deployment scenarios. A four-conversation illustrative pilot is underway using the two cases and the full-team/generalist configurations. Actual fresh-agent outputs, accepted and rejected responses, frozen artifacts, browser observations, and expert reviews are retained separately. The [dynamic workspace](https://capabilitymatters.org/agentic-le/dynamic/) shows timestamped saved records and progress; an in-progress record is not a completed result. No empirical finding is established by this protocol, an offline fixture, or a successful schema check. The frozen fifteen-run study used the earlier fixed workflow and remains a separate record.

The catalog belongs in [`src/data/lifecycle/dynamic-flower.json`](../../src/data/lifecycle/dynamic-flower.json). It is separate from the earlier flower catalog and experiment presets. The companion [paper-framing draft](dynamic-flower-paper-framing-draft.md) explains the change in research question and evidence status.

## What is being studied

The simulated conversation is the learning-engineering team's conversation about a design. Its members can ask one another questions, challenge assumptions, request an expert judgment, change a proposal, and retain a disagreement. The design task may concern a resource about feedback conversations, but that does not make the run a simulated conversation between a learner and a colleague.

**Dynamic generation and scripted verification are different activities.** Design/Develop must use actual model-generated messages and conversation-dependent routing to support an agentic claim. A handwritten message sequence can test routing and replay, but must be labeled an offline scripted fixture. Deploy/Test deliberately uses repeatable scripted inputs to observe the generated interface. Those test scripts are neither a replacement design conversation nor a simulated learner's reasoning.

The question is: **How do explicit expertise boundaries and team configurations shape a design conversation, the resulting resource, and its behavior under different deployment conditions?**

Use two named phases:

| Phase | Work | Boundary |
| --- | --- | --- |
| `design_develop` | A dynamically routed conversation produces requirements, decisions, domain reviews, and an executable candidate. The user selects the team configuration and case. | Freeze a versioned artifact and its complete public conversation before revealing the test fixtures. |
| `deploy_test` | Execute the same frozen artifact under easy, medium, and hard conditions. A separate evaluation agent inspects the case, conversation, artifact, scenarios, and actual observations. | Report process once per artifact and results separately for each artifact/scenario pair. A repair starts a new version and test set. |

The unit of generation is one design conversation and its frozen artifact. Three deployment scenarios are repeated tests of that artifact, not three independent teams or three learners. Evaluator calls also do not increase the number of generated candidates. Mechanical task correctness, design support for learning, and observed human learning are different claims.

## A modest first demonstration

Start with one case, two configurations, and one run per configuration: the full specialist team and the broad generalist. This yields two design conversations, two frozen artifacts, and six artifact/scenario tests. The second case can extend the demonstration to four conversations and twelve tests. Further configurations and repetitions are selectable, not silently added.

This size can illustrate the tool, evidence trail, and effects of a user edit. It cannot estimate stable condition effects or failure probabilities. Record the selected matrix, seed/order, model settings, turn/context limits, and maximum generation and evaluation invocations before starting. Record realized usage separately; equal limits do not imply equal tokens, time, or compute.

### Two fictional microcases

| Case | Public design brief | Capability and system requirements |
| --- | --- | --- |
| Feedback handoff practice (`feedback_handoff`) | A fictional team lead must distinguish a supplied observation from an assumption, ask a context-seeking question, and choose a feasible next step after a missed handoff. | Explain the relationship between a response and supplied facts; allow reconsideration, skipping, and clearing; preserve uncertainty; operate on a shared device without personal records. |
| Shared-equipment workshop planning (`shared_equipment`) | A fictional volunteer proposes a workshop plan using a small kit inventory, available support, and stated participant needs. | Make resource constraints inspectable; support a feasible allocation or a reasoned fallback when the original plan cannot work; allow feedback, correction, and user-supplied case updates. This is a practice tool, not a live checkout database. |

All names, requests, quantities, and responses are fictional. Rules are supplied as part of the case, not inferred from external regulations. A valid outcome may be a bounded refusal or a request for missing information. Do not require a successful allocation when the supplied constraints make one impossible.

## Expertise and authority

The flower's eight domains remain starting points, not an exhaustive list or a validated taxonomy of individual proficiency. Shared understanding and responsibility to learners and other stakeholders apply to every actor. The simulation does not supply those people's participation, consent, or approval.

The catalog distinguishes `specialist`, `generalist`, `facilitator`, and `evaluator` roles. Each profile has an explicit instruction package, available case knowledge, permitted actions, authority, and limits. Domain membership and authority are separate fields.

- A specialist can explain, propose, challenge, and review claims inside the assigned domain. Outside that domain, the actor identifies the question and refers it to an appropriate participant or records it as unresolved. Implementing an approved requirement does not grant authority to invent its domain rationale.
- The generalist receives an introductory overview across domains and its own broad but shallow brief. It can reason from supplied facts and implement a candidate. It does not receive all specialist packets under a different name, and it is not instructed to make mistakes, overlook a particular requirement, or obtain an inferior score.
- The facilitator manages questions, speaking requests, issue state, and decisions. It has no default specialist authority and cannot convert another actor's objection or missing review into an expert approval.
- The evaluator is a separate actor configured with learning-sciences and systems-engineering expertise. It contributes no design decisions and receives no opportunity to repair the frozen candidate while scoring it.

These are **instruction and information-access boundaries**. A general-purpose model retains pretrained knowledge that a prompt cannot erase. Domain labels, common case facts, code requirements, and other actors' statements may cue knowledge outside a supplied package. Record out-of-domain claims and unsupported confidence as role-fidelity observations. Do not claim that a successful boundary prompt proves knowledge isolation or that an omitted domain is cognitively absent.

Review a generalist for appropriate scope and reasoning from its introductory package, not for deliberately poor performance. If it produces a strong answer, retain it. If a specialist supplies a weak or unsupported answer, retain that too. Requested expertise is not demonstrated expertise.

### Selectable design configurations

All selected configurations share the same case, public constraints, model settings, conversation policy, artifact contract, and declared resource ceilings. Use the exact condition IDs in the new catalog.

| Configuration | Intervention | Interpretation limit |
| --- | --- | --- |
| Full specialist team (`full_team`) | Retain all eight specialists, the facilitator, and explicit assessment overlap on Data Science. | Establishes a reference instruction configuration, not a validated human team. |
| Domain omitted (`assessment_omitted`) | Withdraw the primary member's assessment assignment and Data Science's assessment overlap while retaining the primary identity. Retain shared duties and record unreviewed domain questions. | Other instructions and pretrained knowledge may still support that perspective. |
| Responsibility withdrawn (`assessment_withdrawn`) | Withdraw assessment from the primary actor while preserving Data Science's declared overlap. | Compensation is a possible observed process, not an assumed outcome. |
| Member removed (`assessment_member_removed`) | Remove the primary assessment actor; Data Science retains the overlapping assignment. | This changes the available participants as well as responsibility distribution. It does not predetermine how many turns will occur. |
| Broad generalist (`generalist`) | Replace specialist participation with the introductory generalist and retain the procedural facilitator. | This is a breadth/depth instruction contrast. It differs from the earlier one-actor condition, which retained all scheduled specialist duties. |

Dynamic conversations need not consume the same number of turns. Compare common ceilings and stopping rules, and report actual turns, selected speakers, unresolved issues, and usage. Do not add otherwise unnecessary turns merely to make counts identical. A change to the generalist's knowledge package, the facilitator's authority, or an overlap assignment creates a new configuration version.

The current standalone configuration uses phase call ceilings of 24 for `design_develop` and 12 for `deploy_test`, with a 600,000-character context ceiling for new configurations. Every retained request consumes its phase budget, including failed responses and expert-evaluator calls. The default therefore permits at most 36 model calls, and an explicit `run --max-calls N` can further limit a dispatch. These configurable ceilings do not imply equal realized usage. A run plan must state any budget changes and separately account for browser execution resources. The pilot's planned handoff-team update has a separately declared 24-call deployment ceiling.

### Recorded pilot continuation

The initial pilot configurations retain their original 180,000-character context ceiling. A complete workshop process-review prompt required 274,397 characters, so the runner refused to request that review. The continuation raises the effective allowance to 600,000 after artifact freeze and before any expert request. It appends a `runtime_amendment` event, preserves the original configuration and journal prefix, archives the exact original run bytes and both runtime source trees, and validates the effective source pins. Each candidate receives the same continuation before expert review. Specialists still authoring continue under their original pinned runtime until freeze.

The allowance concerns characters in the complete retained prompt. It is not a claim about a provider's token window, a target prompt length, or permission to truncate input. The amendment changes no role authority, scenario, evaluation rubric, call budget, routing rule, or evidence contract. Existing records display both the original and effective allowance; a new copied draft uses the effective allowance. Prior input and source bytes remain available for replay.

The original CLI batch produced five retained startup timeouts, including one bounded compatibility retry, without accepted messages or model output. A separately identified pilot uses fresh collaboration agents with no inherited study conversation. Each receives the exact retained role prompt and schema through file transport and writes an unchanged response for the runtime to validate. The record mode is `manual` for this transport, with `response_origin: actual_llm_collaboration_agent`; it is not an offline scripted fixture. Exact input/output hashes and task identifiers are retained. The platform does not independently report the inherited model identifier, token usage, or a CLI sandbox receipt for these calls. Instructions restrict reading to the supplied files and writing the response, but this transport does not establish independently verified tool isolation or knowledge erasure.

## Conversation contract

Start with the common case and a procedural opening question. Subsequent speakers are chosen through addressed requests, objections, missing domain judgments, and proposed decisions. The system must not cycle through a fixed roster and call that a dynamic conversation.

Each accepted public turn records the speaker, addressed participants, message, relevant issue/claim IDs, supporting evidence, requested action, and any domain-scoped review. Contributions can include a question, referral, answer, proposal, objection, revision, or synthesis. These are public work products, not private chain of thought.

The routing record names the eligible candidates, the selected next speaker, and why that request or issue was selected. Validate that the actor is available and authorized for the requested action. A deterministic tie-break rule is acceptable if it is declared; a scheduled sequence that ignores the conversation is not. No participant is forced to endorse a proposal simply because its turn has arrived.

An implementation contribution must link the artifact revision to the requirements or decisions it implements. A decision must preserve consequential dissent and the relevant expert review. A procedural synthesis is not a substitute for those reviews.

### Review states and freeze

Use explicit domain review states such as `approved`, `conditional`, `objected`, and `not_reviewed`, with actor, domain, claim/artifact version, evidence, and rationale. The precise wire names are validated by the runtime contract.

- An actor may approve only within its configured authority. Approval concerns a stated design claim and version, not all possible use or a real organizational release.
- A missing specialist leaves that perspective `not_reviewed`. It does not automatically make the artifact fail, and the facilitator may not fill the gap by assuming the missing expertise.
- An actual unresolved objection blocks a normal freeze. Proceeding requires an explicit, scoped user risk-acceptance record. An agent cannot invent that human decision.
- Conditional approval retains its condition and whether it has been satisfied. Unreviewed perspectives, accepted risks, and unresolved questions remain attached to the frozen artifact.
- A budget or context limit can end the conversation without a freeze. Preserve the partial candidate and identify the stop as incomplete rather than claiming agreement or a completed project.

### Complete history within a declared cap

Retain the full accepted public conversation and supply it untruncated to each subsequent design call, within the declared context budget. Retain rejected outputs and provider failures separately with their status and reason. Preserve the exact prompt projection used by every call so the visibility rule can be audited.

The context budget must account for the full public history, current artifact, case, profile, and response contract. When the next call cannot carry the required context, stop before making it. Do not silently drop earlier turns, clip messages, replace them with a summary, or claim complete conversational memory after doing so. A separately designed summary-memory experiment would need another protocol/version.

Declare the maximum turns, response size, context size, elapsed time, and allowed evaluator/test requests. Report which limits are enforced by the runtime and which are only provider settings. Retain actual invocation and usage records. Invalid output and interrupted calls remain visible; any retry policy must be declared in advance and included in the invocation ceiling.

## Artifact freeze and test visibility

Before generation, version and hash the public case, role packages, condition, routing/stopping policy, hidden scenario fixtures, and expected mechanical outcomes. The generation prompt receives only the public projection. The withheld fixture descriptor identifies what exists without exposing its answer-bearing content.

Freeze records bind the exact executable source, source hash, artifact version, requirements, conversation head, review states, and unresolved issues. Freeze and scenario-reveal events must have an explicit order. The evaluator receives all scenarios and the complete conversation after this boundary.

“Hidden” means **withheld from generation context until the artifact is frozen**. It does not imply that a public repository or browser-delivered JSON file securely conceals data from a user. The runner must construct and retain the actual generation projection rather than rely on an instruction telling the model to ignore test data it has already received.

Difficulty changes the supplied instances or deployment conditions of stated requirements. It must not introduce an undisclosed policy after generation and then count failure to anticipate it as a capability deficit. The fixtures and oracles are fixed before observing the candidate. Changed or corrected fixtures create a new test-suite version and a clearly identified rerun.

## Deploy/Test scenarios

Test **the same artifact hash** under all three difficulties. Their expected outcomes come from the public case rules and predeclared fixtures. The table gives the intended distinctions; the catalog contains the executable facts, actions, and assertions.

| Case | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Feedback handoff | An explicit missed-handoff record, an available colleague, ten fictional minutes, and a quiet space. | A possibly stale timestamp, changed coverage, five fictional minutes, and a phone-sized screen. | A stale record, unavailable colleague, unconfirmed coverage, two fictional minutes, and an offline narrow-screen route require an appropriately conditional follow-up. |
| Workshop planning | Three pairs, three kits, and one facilitator allow a straightforward allocation. | Two kits for three pairs require a meaningful alternative and an explicit support plan. | One kit and an unavailable facilitator require a bounded alternative, postponement of work requiring absent supervision, and an offline narrow-screen route. |

Hard cases are demanding, not programmed failures. A robust artifact may pass them. “Easy” does not excuse a failure; “hard” does not establish that an observed failure is unimportant. Apply the same declared expectations within each case/fixture version.

The six fixture IDs are `feedback_handoff_easy`, `feedback_handoff_medium`, `feedback_handoff_hard`, `shared_equipment_easy`, `shared_equipment_medium`, and `shared_equipment_hard`. Difficulty is an investigator-defined bundle of conditions, not a validated or equally spaced measure of cognitive complexity.

The common browser contract exposes scenario JSON through `#scenario-input` and `#apply-scenario`, displays the applied facts in `#scenario-view`, and offers `#response-input`, `#try-response`, `#feedback`, `#revise-response`, `#skip-practice`, `#reset-practice`, and `#practice-status`. Scenario JSON contains `title`, `facts`, `constraints`, and `task`; it is data, not executable code. The generator sees this interface contract, not the withheld fixture contents.

Each current fixture applies its case, enters a deliberately problematic authored response, requests feedback, opens revision, enters a more defensible authored response, requests feedback with Enter, then skips and resets. These contrasting inputs are test stimuli, not observations of a learner changing their mind. The initial fixtures check case display, feedback presence, editable revision, visible status, and clearing. Nonempty feedback or a success banner does not establish semantic correctness. The expert evaluator must inspect the actual initial/revised inputs, rendered outputs, and case facts to judge whether the feedback is appropriate.

The test producer records actions, supplied inputs, expected and observed states, assertions, elapsed times, runtime errors, recovery behavior, keyboard/access checks, screenshots where applicable, and unexecuted steps. Every report binds the exact artifact version/hash and scenario ID/hash. A report without those bindings cannot establish a result for the candidate.

Use `pass`, `fail`, `not_run`, `blocked`, or `unknown` with explicit meanings. An observed contradiction of an executable requirement is a failure; an unperformed check is not a pass or a zero-quality score. A browser error, missing control, or harness problem must be distinguished from a pedagogical finding. Preserve the evidence needed to attribute a failure to the artifact, environment, fixture, or harness.

Task-choice correctness concerns the rule-governed response exercised by the harness. A free-text answer without a deterministic oracle is not automatically graded by the model as a mechanical fact. A model's assessment of its appropriateness remains an evaluator judgment. A short automated execution time does not establish that a person can understand or complete the activity within the time limit.

An LLM forecast about deployment, learner behavior, or recovery is a proposal or prediction. It is never substituted for an observed execution record. Human learning, wellbeing, usability, real transfer, and operational adoption remain unobserved unless a separately authorized study collects that evidence.

### Repairs

A failed test may motivate another design conversation, but it cannot alter the frozen artifact under assessment. A repair creates a new immutable version with a parent version, reason, changed requirements, and new conversation events. Freeze it and rerun all three conditions. Keep the original failure and the new results; do not replace the old report or treat the improved version as a new independent team. Retesting already revealed fixtures assesses regression and repair; a new claim about unseen conditions requires a separately held-out fixture set.

## Separate expert evaluation

The evaluation agent receives the public brief, role and knowledge boundaries, complete accepted conversation, frozen artifact, all three scenario fixtures, actual test reports, failures, and unresolved issues. It can inspect the reasoning expressed in public decisions and whether those decisions reached the implementation. It must distinguish a proposed behavior from a verified behavior.

Independence means a fresh evaluator context and no participation in generation or repair. It does not imply a human expert, validated professional proficiency, statistical independence, or immunity from model bias. Record its model/version, expertise instructions, permitted tools, and whether it shares a base model with the design agents. Because it reads the full role-labeled conversation, do not claim assignment masking or successful blinding.

If evaluator-directed checks are supported, they use a bounded, read-only request interface. Retain the request, actual execution result or `not_run` reason, and all subsequent judgments. Such checks cannot modify the candidate. Common predeclared tests remain distinguishable from adaptive follow-up checks; unequal additional coverage must not be presented as a common benchmark.

### Process and result rubrics

The catalog versions two distinct rubrics, each with six criteria grouped as two per axis. Each retains three axes, with no combined total across axes and no combined process/result score. The catalog's ordinal scale is 0–4; missing evidence is `null`, not zero. The runtime and catalog must agree on scale and anchors before execution. Preserve criterion scores and their evidence even when an axis summary is displayed.

| Axis | Process: once per conversation/artifact | Result: separately for each artifact/scenario |
| --- | --- | --- |
| Human flourishing support | Were learner/stakeholder concerns, choice, burden, access, and disagreement made explicit and handled within authority? | What do source and observed behavior establish about choice, access, privacy of fictional inputs, recoverability, and avoidable burden in this scenario? What still requires people? |
| System performance | Were requirements, dependencies, expert referrals, objections, integration decisions, and implementation changes traceable and responsive to evidence? | Did the frozen implementation produce the required mechanical outcomes, respect constraints, and recover under the actual tested conditions? |
| Learning support | Were capability targets, learning mechanisms, practice, feedback, assessment limits, and transfer claims argued with appropriate domain review? | Which opportunities for aligned practice, useful feedback, reconsideration, and assessment are implemented and observed? This is design support, not a measured learning gain. |

A zero requires evidence supporting the lowest anchor, not merely absent records. High process scores do not establish implementation success, and high mechanical performance does not establish learning or flourishing. An attractive explanation cannot repair a failed executable behavior. Strong conclusions require cited evidence and explicit limits.

Every axis judgment contains its score/status, rationale, evidence references, uncertainty, and unknown requirements. Evidence references name the representation: a conversation event, raw source, captured rendered text, or an execution assertion. Quote validation checks that representation. A citation mismatch is a review-validation failure, not a demonstrated artifact failure.

Report process as one three-axis vector per frozen version. Report result as three separate vectors keyed to easy, medium, and hard. Include the underlying mechanical outcomes and failures alongside the judgments. If multiple independent evaluator calls are authorized, retain every attempt and their disagreement rather than selecting a favorable result. Do not use repeated model calls as additional generated cases or convert ordinal ratings into outcome probabilities.

## Compact schema requirements

The catalog contract is `dynamic-flower-1` with top-level collections `domains`, `agents`, `cases`, `conditions`, `scenarios`, and `rubric`. The following is the minimum semantic contract; the runtime's validated wire schema is authoritative. Additive fields must preserve these distinctions.

| Collection or record | Required content |
| --- | --- |
| `domains` | Stable ID, display label, scoped knowledge/instructions, limitations, permitted review authority, package version/hash. |
| `agents` | Stable ID, `kind` (`specialist`, `generalist`, `facilitator`, `evaluator`), `domains`, `brief`, `limits`, and permitted `capabilities`. Generalist specialist-domain membership is empty; breadth comes from its own introductory brief. |
| `cases` | Stable ID/version, public fictional facts/rules, capability and system requirements, artifact interaction contract, unresolved information, public-projection hash. |
| `conditions` | Stable ID, `agent_ids`, `domain_overrides`/`brief_overrides` when needed, `facilitator_id`, `evaluator_id`, and message budget. The resolved configuration pins the roster, packages, phase/context budgets, updates, and copied scenarios. |
| `scenarios` | Case ID, difficulty (`easy`, `medium`, `hard`), fixture ID/version/hash, reveal boundary, inputs, environment constraints, actions, expected mechanical outcomes and assertion provenance. |
| `rubric` | Separate `process` and `result` criterion arrays, each criterion's `id` and `axis`, `score_min`, `score_max`, `anchors`, and aggregation/evidence rules; no composite field. |
| Conversation event | Event ID/sequence, actor, addressees, type, public text, issue/evidence/decision references, scoped review or objection, next-speaker selection reason, prior-event hash. |
| Freeze record | Conversation head, artifact version/parent/source hash, requirement version, review states, explicit accepted risks, freeze status/reason, hidden-fixture commitments. |
| Deployment observation | Artifact version/source hash, scenario ID/hash, harness/version, actions, expected and observed states, result status, error/not-run reasons, evidence files/hashes. |
| Evaluation record | Frozen input hashes, independent evaluator identity/model/profile, one process vector, three scenario-specific result vectors, source references, uncertainty, unknowns, validation state, invocation provenance. |

The evaluator response has this exact field shape; hashes and invocation provenance belong to its retained input/output envelope:

```ts
type Evaluation = {
  scope: "process" | "result";
  artifact_version: number; // validated as an integer frozen version
  scenario_id: string | null; // null for process; exact fixture ID for result
  scores: Array<{
    dimension_id: string; // the catalog's criterion ID, not an axis total
    score: 0 | 1 | 2 | 3 | 4 | null;
    rationale: string;
    evidence_refs: Array<{
      source: "event" | "html" | "rendered";
      id: string;
      quote: string;
    }>;
  }>;
  limitations: string[];
};
```

One process response must contain all six process criterion IDs: `agency_and_burden`, `domain_boundaries`, `responsive_dialogue`, `decision_traceability`, `learning_reasoning`, and `participation`. Each result response must contain `agency_access`, `task_behavior`, `recovery`, `capability_support`, `feedback_and_revision`, and `credible_use`. Their axis mappings come from the rubric. A null score requires an explicit explanation in the rationale; an accepted response cannot silently omit a difficult criterion.

The packet's exact source registry uses `event/<seq>`, `artifact/<version>`, `scenario/<scenario_id>/action/<action_id>`, and retained text checks at `scenario/<scenario_id>/check/<check_id>`. A reference must name the appropriate representation and quote it exactly. A valid process record and three valid scenario-specific result records are distinct outputs, not one aggregate ranking. A failed evaluation attempt remains retained with its validation reason.

## Acceptance before live execution

Verify these properties with offline adversarial fixtures, then report which have actually passed. Offline results establish software behavior only.

1. Alter a request or objection and observe a corresponding speaker-selection change; reject an unavailable or unauthorized speaker. Verify that no hidden fixed roster schedule overrides the request.
2. Attempt an out-of-domain approval, a facilitator's substantive expert approval, a missing-domain review, and an unresolved objection. Preserve the different outcomes and require an actual scoped user record for risk acceptance.
3. Reach the context/turn cap with unresolved work. The run stops explicitly incomplete without truncating the public conversation or inventing consensus.
4. Inspect every generation prompt projection. Withheld test content is absent before the artifact freeze, and the complete accepted public conversation is present.
5. Bind all three scenario reports to one exact source/version. Reject a changed source, changed fixture, missing binding, or silently substituted repaired artifact.
6. Supply a missing test, a harness error, an artifact failure, and an LLM forecast. Only actual supported observations can satisfy mechanical requirements; unknowns remain distinct.
7. Verify that the evaluator receives the complete conversation and all scenarios, produces separate process/result axes, and cannot award implementation credit for a proposed repair.
8. Preserve rejected outputs, failed model invocations, source/receipt gaps, and evaluator-validation failures. Reject manufactured completion or evidence references.
9. Edit a case, role package, condition, or fixture and export a new version. A new run receives the change; an existing frozen record and its scores do not change.

The live preflight must display the selected matrix, executable/model prerequisites, maximum model invocations, provider limits, and actual output destinations. No live command is authorized merely by this protocol's existence. Only publish empirical claims after real execution, provenance checks, and the applicable review boundary.

## What users can change

Expose the public case facts, requirements, team configuration, domain instructions, introductory generalist brief, overlap, process limits, and prospective scenario settings as editable, versioned inputs. Explain which settings change generation and which change testing. A user can inspect the conversation, see an unresolved issue, change a requirement or profile, and start a separately identified run.

A scheduled user message during a conversation is an explicit `user_update`, with its phase and turn boundary retained. It does not silently rewrite earlier messages or approve specialist claims. A scenario authored after seeing a frozen candidate is a useful exploratory test, but must be labeled late-defined rather than predeclared hidden evidence.

For an already frozen artifact, distinguish a new deployment test from a repair and from a new generation experiment. Show the exact version and evidence used by every score. Preserve the earlier result when a user updates the tool. The useful demonstration is this inspectable sequence of question, conversation, artifact, test, judgment, and revision, including failures and unknowns.
