# Paper framing for the dynamic-conversation redesign

This draft specifies how a future paper should describe the redesigned study without reinterpreting the earlier fixed-workflow results as evidence for it.

**Status:** proposed framing only. Do not overwrite the frozen paper, its results, the private historical appendix, or its evidence files using this text. The executable-study requirements are in [dynamic-flower-study.md](dynamic-flower-study.md). New results require new runs under the validated redesign.

## Research object and title

Retain the user's exact title if the main paper is revised:

> Exploring the learning engineering flower with agentic simulation

Use this study label immediately underneath or in the opening sentence:

> A pilot of dynamic learning-engineering design conversations and source-bound deployment tests.

The first paragraph must identify the conversation: it is the design team's conversation about a resource. The resource may support feedback conversations, but that topic is not the same thing as a simulated learner–colleague dialogue. If a future artifact includes such a dialogue, specify separately whether it was generated, executed, reviewed, or evaluated with people.

## Draft opening for the redesigned study

We use a language model to represent specialists who discuss a small learning-resource design through their assigned areas of expertise. Questions, referrals, objections, and decisions determine who contributes next. A broad generalist has an introductory cross-domain brief, while specialists receive deeper domain-specific instructions. The process has two phases: Design/Develop produces a frozen artifact and its complete public conversation; Deploy/Test exercises that artifact under easy, medium, and hard scenario conditions. A separate evaluation agent with learning-sciences and systems-engineering instructions reviews the scenarios, conversation, artifact, and observed behavior. It assesses the design process and the result separately on human flourishing support, system performance, and learning support. The study is intended to make the tool and its editable assumptions inspectable, including failures, unresolved questions, and the limits of simulated expertise.

This is prospective wording. Before describing it as an executed method, verify the corresponding implementation, prompts, routing records, artifact versions, test reports, and evaluation records. Do not insert success claims into the opening before those records exist.

## The methodological change

| Earlier fixed workflow | Redesigned protocol | Consequence for interpretation |
| --- | --- | --- |
| Predetermined stage contribution slots and coordinator decisions. | Request- and objection-driven selection of the next speaker. | The conversation itself becomes inspectable process evidence. Merely producing more messages is not evidence of better collaboration. |
| Recent contribution/decision records and artifacts were clipped to bounded context. | Complete accepted public conversation is supplied within a declared cap; the run stops if it cannot preserve that history. | Claims about conversational continuity must be checked against the actual prompt projections. |
| One actor retained the reference slots and their domain-specific duties. | The generalist has its own introductory cross-domain package and no specialist domain membership. | This is a different comparison. Earlier one-actor scores do not estimate the redesigned breadth/depth contrast. |
| Generated stages included later assessment and refinement plans; revisit requests did not rebuild the scored HTML. | Explicit artifact freeze followed by actual tests of that same version under three conditions; repairs receive new versions. | A plan, forecast, observed failure, and implemented repair remain separate evidence types. |
| Reviewer packets withheld the generation message history and role metadata. | The independent evaluation agent receives the complete public conversation, role boundaries, scenarios, and observed results. | Process can be judged, but assignment masking cannot be claimed. Independence is operational separation, not proof of independent expertise. |
| One three-axis full-solution rubric. | One three-axis process assessment per artifact plus separate three-axis result assessments for easy, medium, and hard. | New rubric scopes and difficulty conditions cannot be pooled with the earlier scores. |

## How to label the existing results

Suggested status statement for a future paper or study index:

> The earlier results come from a fixed, staged generation workflow. They assessed the generated resources and plans, with bounded browser observations, rather than full dynamic team conversations. They motivated this redesign and remain a separate record. They do not validate the redesigned conversation, expertise-boundary, deployment, or evaluation mechanisms.

Do not rename the earlier fifteen runs as dynamic conversations, infer that specialists had isolated knowledge, relabel the earlier one-actor condition as the new shallow generalist, or treat its artifact ratings as process scores. Preserve the earlier sample sizes, failures, exclusions, model settings, and evidence limitations in their own versioned record.

The still-earlier eighteen-run exploration remains in its private historical appendix. Its material should not re-enter the redesigned main paper as new empirical support.

## A compact future paper structure

1. **Question and flower framework.** Explain why expertise boundaries, shared understanding, and the consequences of domain judgments matter. State what the simulation represents and what requires actual people.
2. **Tool and editable contract.** Describe the case, role packages, selectable configurations, dynamic routing, complete-history cap, domain review authority, and artifact freeze. Include one short actual exchange once it exists, with visible question, referral/objection, response, and decision.
3. **Two-phase method.** Describe the selected modest case matrix. State when scenario fixtures were committed and revealed. Bind easy, medium, and hard tests to the same artifact version. Explain the separate evaluator and the process/result rubric scopes.
4. **Illustrative results.** Report actual conversations, artifacts, test outcomes, failures, unknowns, and separate judgments. Show one requirement traced from a contribution through implementation to an observation. A second example can show a missing review, disagreement, or a repair that required a new version.
5. **Interpretation and user iteration.** Explain what the demonstration establishes about the tool. Show how a user changes one declared input and obtains a new inspectable run. Do not infer population effects or the necessary composition of human teams from a few examples.
6. **Limitations, provenance, and availability.** Discuss instruction boundaries, pretrained knowledge, evaluator bias, transcript/evidence completeness, fixture selection, unmatched realized usage, and unobserved human outcomes. Identify the public and retained-private evidence precisely.

Keep any numerical results section pending until the redesigned system has actually run. An offline contract test may be reported as software verification, not as evidence that a team configuration improves the generated design.

## Results that would be informative

| Evidence | Appropriate statement | Unsupported extension |
| --- | --- | --- |
| A specialist refers an out-of-domain claim and the relevant expert's answer changes a decision. | The retained conversation shows a scoped referral and a traced decision change. | The model has no knowledge outside its role, or real professionals would behave the same way. |
| A generalist gives an adequate answer under its introductory brief. | The broad/shallow instruction condition produced an adequate answer for this case under the recorded test. | The condition failed because it did not perform worse, or specialists are unnecessary. |
| A domain objection remains unresolved at the cap. | The conversation stopped incomplete, with the issue and partial candidate retained. | A completed team decision occurred, or the untested artifact deserves a zero on every result axis. |
| The frozen resource passes easy and fails a hard recovery check. | A source-bound execution demonstrated a particular failure under the stated condition. | Hard conditions generally defeat that team, or a learner failed to learn. |
| A high process judgment accompanies a mechanical failure. | The evaluator judged the process favorably despite an observed implementation gap; the two assessments remain separate. | A combined score proves that process quality compensated for the failure. |
| An edited profile produces a different next run. | The tool supports a visible, versioned change and a new result. | A single before/after pair isolates the cause of the difference. |

## Language to use consistently

- Use **design conversation** for the public exchanges between the learning-engineering roles.
- Use **practice task** for what the learner-facing resource asks someone to do.
- Use **deployment scenario** for a frozen test condition applied after artifact freeze.
- Use **observed mechanical outcome** for an executed assertion and its captured result.
- Use **process judgment** and **result judgment** for the separate evaluator's ratings, with explicit uncertainty.
- Use **learning support** for evaluated design opportunities. Reserve **learning gain**, **transfer**, and **human flourishing outcomes** for studies that observe those outcomes with people.
- Use **instruction/knowledge-package boundary**, not knowledge erasure or proof of expert competence.
- Use **separate evaluation agent**, not an omniscient coordinator, a demonstrated human expert, or a successfully blinded judge.

## Publication boundary

The current frozen paper and results remain a prior version until an explicitly reviewed replacement is ready. A future publication should state whether it is presenting a tool specification, verified software demonstration, executed illustrative cases, or a comparative empirical study. These are different completion states. The new main paper must not obtain apparent results by relabeling old records or treating an LLM forecast as a deployment observation.
