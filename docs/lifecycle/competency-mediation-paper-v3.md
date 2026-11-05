# Making Expertise Consequential: A Simulator for Teaching and Studying Competency Mediation in Learning Engineering

**Working manuscript · revised 4 November 2026.** Authors and affiliations require coauthor confirmation.

## Abstract

Learning engineering draws on several disciplines, yet the presence of relevant expertise does not explain how a team arrives at an intervention. We argue that competency mediation—the translation of bounded expertise into consequential design commitments—can be made an explicit object of learning engineering education and research. We present a simulator that connects role-specific evidence and dialogue to frozen decisions and their stress-test consequences. A deterministic implementation demonstrates the experimental contract through 36 programmed designs and 108 authored-surrogate applications. Three dynamic examples use independently executing professional-role agents, optional consultants, explicit authority and resource limits, and separate process and result reviews. The clearest example is a control-room team that replaces dedicated unranked practice with a sensor-staleness rehearsal, defines joint start/stop conditions, and limits its readiness claim. Testing that unchanged intervention exposes a concrete cost: the design does not establish novice diagnosis and cannot start the combined radio/AI-failure scenario. These are generated design decisions and model-reasoned projections, not observed workplace or learning outcomes. The contribution is a practical way to rehearse multidisciplinary design, trace where expertise affects commitments, and develop testable hypotheses about collaboration. Educational effectiveness and causal competency effects remain to be established.

**Keywords:** learning engineering; competency mediation; interdisciplinary design; agent simulation; professional education; scenario-based research.

## 1. Thesis and significance for learning engineering

A design team may know that learners need practice, that a system has unsafe failure modes, and that operations cannot spare another shift. The difficult work is deciding what those contributions mean together: what to build, what to omit, what evidence is required, and when an intervention can be released. A useful account of learning engineering must make those decisions visible.

**Our thesis is that a competency-mediation simulator makes interdisciplinary judgment inspectable by showing which expertise changes a design decision and what that commitment can support under changing conditions. That decision-to-consequence trace is the contribution for learning engineering teaching, research, and organizational rehearsal.** This is an argument about an instrument and its uses. It is not a claim that simulated professionals reproduce human teams or that adding a specialist necessarily improves outcomes.

We distinguish **coverage**, the competencies accessible to a team; **utilization**, whether a contribution is elicited and influences a decision; and **integration**, how contributions are reconciled with one another and with organizational constraints. The learning engineering flower offers a nonexclusive vocabulary for considering disciplinary contributions ([Ali et al., 2025](https://doi.org/10.59668/2109.21837)). Competency mediation refers here to a traceable design process, not a statistically identified indirect effect.

The instrument makes three contributions: a configurable representation of competencies, evidence, authority and resources; a design-to-test architecture that prevents retrospective repair; and worked examples in which a reader can follow actual contributions into a frozen intervention and its limits. For the LERN community, the immediate value is an inspectable case activity and a research instrument for explaining how a design emerged.

### 1.1 Use cases: who can do what with the instrument?

**Professional preparation and studio teaching.** An instructor can give learners the conversation up to the freeze, ask which evidence changed the proposed intervention, and require a prediction about an unexpected event. Learners then compare that prediction with the stress projection and identify the omitted competency contribution, resource tradeoff, or unsupported claim. The assessable product is a source-linked explanation or revised design rationale. A subsequent teaching study should test novel-case reasoning and delayed transfer; the current examples do not demonstrate a learning benefit.

**Research on interdisciplinary design.** A researcher can define a contribution episode—evidence disclosed, proposal challenged, commitment changed, consequence exposed—and code it consistently across runs. Role-specific knowledge, consultation availability, authority, and resources provide manipulable conditions for later studies. The present examples support hypothesis formation and instrument inspection. They do not isolate causal effects of professions or competencies.

**Organizational design rehearsal.** A cross-functional team can use a scenario to surface unowned handoffs, assumptions about available staff, and evidence required before release. The output is a decision trail and an explicit boundary for the proposed intervention. It can inform a subsequent real design review; it is not certification, an operational forecast, or a substitute for affected-person and domain-expert review.

## 2. Architecture: connect contributions to consequences

![Figure 1. Two implementations connect scenario inputs to frozen interventions and separate evidence classes.](figures/competency-architecture.svg)

**Figure 1. Competency-mediation simulator architecture.** The deterministic path uses authored policies and produces synthetic indices. The dynamic path uses independent model contexts, actual professional dialogue, and model-reasoned stress projections. Each applies three event levels to an unchanged design. The paths have distinct configurations and are not matched treatment groups. Gates validate declared evidence and authority; they do not supply missing expertise or a better intervention. The fresh reviewer observes and critiques after freeze, without repair authority.

### 2.1 Represent the professional task

A scenario specifies the organizational problem, public evidence, available roles, resource limits, candidate responsibilities and deployment events. Dynamic participants additionally receive private evidence, explicit competencies and exclusions, decision rights, tools and availability. Competencies can overlap. A senior operator can implement training and interpret operational cues without certifying assessment validity; a service designer can apply a supplied fictional policy without acquiring unrestricted legal authority.

Only a participant's own packet and delivered public messages enter its assigned design context. A consultable specialist joins after an actual request and has a cost. A substantive claim must identify its evidence and whether it is a supplied fact, bounded professional judgment, attributed advice or hypothesis. Outside-scope advice must come from an actual consulted message. The gate checks declared scope, evidence identifiers, source messages, authority, resource arithmetic and exact endorsements. A separate semantic audit checks whether the language respects those declarations.

These are evidence and authority controls. They do not erase pretrained knowledge. The current native contexts share a filesystem; access is instruction-bounded and audited through tool records rather than enforced by separate operating-system sandboxes.

### 2.2 Freeze before testing

Participants propose, question and negotiate in natural professional language. Readable phase instructions organize dispatch without selecting the team's diagnosis or intervention. The team authors actions, owners, costs, rationale, source messages, acceptance tests, exclusions and release conditions. Core participants endorse the exact bytes or withhold endorsement. The dynamic implementation records the frozen artifact with SHA-256; the deterministic implementation retains a fixture hash. No substantive coordinator or hidden repair agent supplies the solution.

Easy, medium and hard conditions are then applied separately to that same design. In the dynamic examples, the deployment task identifies supported actions, unmet demands, plausible sequences and unknown outcomes. A fresh reviewer evaluates the process and result separately and audits expertise claims. The result is a written stress projection, not execution in a calibrated operational environment. A proposed safety check is never converted into an observed pass merely because it appears in a plan.

## 3. Demonstrations and evidence

### 3.1 Deterministic example: a reproducible instrument contract

The authored casebook contains logistics, public-benefits service and control-room settings, each with three illustrative configurations and four seeds: **36 designs and 108 stress applications**. Consultation, proposals, selection priorities, costs, action effects and surrogate outcomes follow programmed rules. Its dialogue-like records are authored templates, with zero live model calls.

Exact replay reproduced the retained output. Checks found no budget overspend, unauthorized or unavailable-expert actions, changed frozen artifacts, mismatched event keys, or missing event levels. These are software findings. An informative negative case is that the benefits operations-lead and human-centered-lead configurations produce identical actions and outcomes when their procedures and priorities remain identical. A change of label alone does not implement a different collaborative process.

The deterministic example is useful for checking the contract and teaching how explicitly assumed rules lead to consequences. Its numerical indices are authored assumptions, not estimates of capability or evidence of disciplinary effects. They are not pooled with the dynamic results.

### 3.2 Dynamic examples: actual dialogue and bounded choices

The three focal examples comprise **12 distinct subagent conversations**—two core roles, one requested consultant and one fresh reviewer in each setting—executing **27 completed task turns**. The record includes 21 public design utterances, three deployment-projection tasks and three reviews. Runtime records identify `gpt-6.1-sol` with high reasoning effort. Task turns are not provider API-call counts. Events are held out until freeze and applied without redesign.

In **AI-assisted logistics**, an operations/training lead and analyst consult a learning scientist. The analyst discloses incompatible pre/post denominators and missing override annotations; the scientist supplies the limits of repeated examples and available assessment. The nine-of-ten-unit plan restricts practice to two workers and withholds release because coverage, attendance and assessor scheduling remain unconfirmed. The transcript shows how evidence changes the problem framing and the scope of the claim.

In **public-benefits service**, a director and service designer/policy steward consult an access practitioner. Their initial alternatives fund assistance or wording changes. Advice about interpreting hours and untested access helps resolve the allocation in favor of assistance, with wording confusion explicitly left unresolved. The nine-unit plan retains no release because authorized review capacity, handoff, recruitment and tested access remain unestablished. The policy steward's limited signoff does not create staff or validate access.

The **control-room example**, developed below, has the clearest explicit revision of a proposed intervention and a conditional release to test. It was selected for the inspectability of its contribution trail, not because it establishes the best outcome. Its operator and safety/simulator engineer consult a learning scientist, negotiate a seven-of-eight-unit intervention, and jointly constrain its release.

### 3.3 What was evaluated

Reviewers traced private-evidence disclosure before reuse, actual consultation influence, resource and authority decisions, unsupported specialist claims, and freeze integrity. All three examples passed bounded process feasibility; none established intervention success. No material visible specialist overreach was identified, while provenance and minor artifact ambiguities were retained.

Result review addressed capability, human conditions, organizational performance and resilience separately. Ratings describe plan sufficiency and evidence availability, not measured human states. Reviewers sometimes labeled absent performance evidence *unknown* and sometimes labeled inadequate planned support *fragile*. We preserve that rubric-calibration limit and do not average the labels. Separate context does not establish independence of model family or human professional judgment.

## 4. Worked example: how the control-room decision changed

The fictional utility has improved alarm acknowledgement times after adopting an AI prioritizer. The operator knows that novices usually follow the ranking, experienced operators use an undocumented timestamp cue, and only twenty minutes are available per operator. The safety engineer knows that sensor staleness can be injected but partial radio dropout cannot, and that paper fallback values have no automatic freshness marking. The learning scientist knows that the current acknowledgement exercise discloses the expected alarm order and that a delayed diagnosis probe would occur after the release decision.

### 4.1 Actual dialogue and the commitments it informed

![Table 1. Verbatim actual dialogue excerpts beside their consequential commitments.](figures/controlroom-dialogue-table.svg)

**Table 1. Actual dialogue-to-decision trace.** Excerpts are verbatim selections from the retained seven-message conversation; the right column contains analytic summaries. O denotes the operator, S the safety/simulator engineer and L the learning scientist. The suffixes identify actual turns, for example O2 is `controlroom-operator-02`. The complete [dialogue](../../experiments/competency-live/2026-11-04/transcripts/controlroom.md) and [source-checked figure data](figures/competency-figure-sources.json) retain context and provenance. The learning scientist specifies the evidence limit within an already cautious discussion; the record does not show that the consultant originated that caution or was causally necessary.

The operator's initial five-unit proposal purchases a job aid, stop/handoff procedure and dedicated unranked practice. Safety proposes a different package: a sensor-staleness rehearsal, explicit freshness criteria, and consultation. The operational consequence of the exchange appears directly in O2:

> “Your disclosure changes my choice.”
>
> “I withdraw my separate two-unit unranked-practice proposal; adding it would exceed eight units.”

The replacement does not make the omitted learning need disappear. O2 retains concern that novice reliance on AI ranking receives no dedicated practice. The learning scientist adds a specific reason to separate acknowledgement from diagnosis—the expected order was disclosed—and explains why next week's probe cannot justify today's release. This advice refines the evidence requirements and is carried into the frozen limitations; it is not safety signoff.

The next safety reply turns an abstract instruction to “check freshness” into an explicit design commitment: prepare an authored event record, compare displayed values with the current scripted state, and stop for contradiction, older state, missing reference or indeterminate match. The engineer also accepts handoff receipt within the existing team. No independently verified clock, numerical freshness threshold, extra personnel or radio-failure capability is invented.

### 4.2 What was frozen

The final intervention commits **seven of eight units**: timestamp job aid (1), stop/handoff (2), staleness rehearsal and local logging (3), and the completed consultation (1). It assigns the twenty-minute slot to aid (3 minutes), rehearsal (10), handoff (5) and recording (2). Both core participants endorse the exact artifact. Start still requires the checked reference and job aid; either participant can stop. Paper values remain uncertain and cannot clear a stop. Dedicated unranked practice and a delayed probe are unfunded, and partial radio dropout is outside scope.

These commitments make the competency contributions consequential. Operational knowledge supplies the cue and feasible delivery structure; safety/systems expertise supplies the reference, recipient and stop conditions; learning science constrains the interpretation of performance; integration selects among incompatible uses of the budget. The trace supports that account of the design. It does not establish that this package is optimal.

### 4.3 What happened in the frozen-plan tests

![Figure 2. Supported conditional behavior and remaining failures for the same frozen intervention.](figures/controlroom-stress-test.svg)

**Figure 2. Frozen intervention applied to three held-out conditions.** The artifact fingerprint is `9ea47a59d515e9ca…`; the full hash, exact endorsements, [deployment projections](../../experiments/competency-live/2026-11-04/controlroom/deployment.json) and [independent review](../../experiments/competency-live/2026-11-04/controlroom/evaluation.json) are retained. These are model-reasoned tests. No trainee behavior, passed start check, handoff success, recovery or learning outcome was observed.

For the **easy event**, the aid addresses a timestamp contradiction despite working AI ranking. The plan supports comparison, stop and handoff only if the event fits the authorized script and pre-start checks pass. A routine alarm set does not establish those conditions. The reviewer rated all four dimensions mixed.

For the **medium event**, a novice leads while a stale sensor produces a confident ranking and the senior operator is busy. The unchanged plan supplies no replacement supervisor. Dropped unranked practice leaves cue recognition unresolved. The reviewer rated capability and human conditions fragile, with organizational performance and resilience mixed. The plan contains a stop rule; it does not establish that the novice notices the contradiction or that the recipient is available.

For the **hard event**, cascading alerts coincide with partial radio dropout, AI loss and stale paper. The frozen release does not cover that combination. The supported decision is **withhold start**, or stop if such conditions emerge during a legitimately started bounded exercise. The reviewer rated capability, human conditions and resilience fragile, while organizational boundary handling remained mixed. This is containment of an excluded demand, not successful diagnosis or recovery.

The learning-engineering lesson is the connection between a defensible local tradeoff and a later limitation. Choosing staleness rehearsal displaced diagnosis practice; restricting the exercise to available simulator functions left a combined failure untested. The value of the example is that a reader can inspect and challenge that chain without allowing the model to repair it after seeing the event.

## 5. Implications and next validation

For education, the example supports a concrete activity: predict the medium-event consequence from O2's budget concession, distinguish detection from prescribed response, and identify what evidence would justify a broader release. Assessment can examine whether a learner cites the actual contribution, identifies the unfunded need, and respects the distinction between a planned check and an observed result.

For research, contribution episodes offer a finer unit than a team label or final score. A subsequent study could ask whether expertise is available but unused, consulted but ignored, or integrated through an altered commitment. Repeated cases and practitioner review can establish whether coding is reliable and scenarios are credible before stronger causal comparisons are attempted. A factorial study is not required for the instrument's immediate teaching and hypothesis-generation uses.

For organizational rehearsal, the examples show the practical importance of preserving uncertainty. An accessibility consultation cannot create interpreting hours; a policy signoff cannot staff a review queue; learning-science advice cannot supply operational authority. The useful output is an explicit commitment and its release boundary, which a real design review can then scrutinize.

The limits are substantial. Scenario facts, costs and event difficulty are authored. Model roles are not validated representations of professionals, and fluent interaction is not evidence of human fidelity ([Aher et al., 2023](https://proceedings.mlr.press/v202/aher23a.html)). The deterministic effects are assumptions; dynamic consequences are written interpretations. Model reviewers share the participant model family and may share its biases ([Zheng et al., 2023](https://arxiv.org/abs/2306.05685)). No observed learning, wellbeing, service resolution or operational safety is reported. Knowledge gates constrain accepted evidence and authority without proving that latent knowledge was absent. Missing confirmations and conservative instructions may themselves encourage no release. Stronger validation therefore requires practitioner and affected-person review, calibrated process coding, an independently testable environment where appropriate, and learner studies on novel-case reasoning and transfer.

## 6. Conclusion

A competency-mediation simulator makes a useful learning-engineering question inspectable: **what did an expertise contribution change, and what followed from the commitment it helped produce?** The deterministic example verifies a reproducible contract; the dynamic examples expose actual questions, concessions, authority boundaries and frozen-plan limitations. The control-room trace shows why this matters: a locally feasible safety rehearsal can displace diagnosis practice and still leave a demanding deployment outside its release. Connecting dialogue, commitment and consequence provides a concrete resource for teaching interdisciplinary judgment and for developing research hypotheses about how expertise becomes consequential.

## Materials and AI use

The deterministic [specification](../../src/data/lifecycle/competency-casebook-v1.json), [runner](../../tools/lifecycle/competency_casebook_runner.mjs) and [retained observations](../../data/lifecycle/competency-casebook/observations-v1.json) define the programmed demonstration. Full focal dynamic dialogue is available for [logistics](../../experiments/competency-live/2026-11-04/transcripts/logistics-gated.md), [benefits](../../experiments/competency-live/2026-11-04/transcripts/benefits.md) and [control room](../../experiments/competency-live/2026-11-04/transcripts/controlroom.md). Role packets, native model provenance, exact endorsements, freezes, projections, independent reviews and failures are retained alongside those records. The [figure source manifest](figures/competency-figure-sources.json) binds every selected quotation to actual source bytes.

AI assistance was used to prepare the instrument and manuscript. Dynamic dialogue and decisions were produced by actual independent model contexts; facts, professional scopes, costs and events were authored. Projections and reviews are model-generated interpretations. No human outcome or causal effect of a competency is claimed.

## References

Ali, Z., Morehead, K., Jay, M., Arner, T., Lis, J., & Braitling, B. (2025). *Learning engineering is a team sport: Collaborative explorations for team building strategies with short scenarios in various contexts.* https://doi.org/10.59668/2109.21837

Aher, G. V., Arriaga, R. I., & Kalai, A. T. (2023). Using large language models to simulate multiple humans and replicate human subject studies. *Proceedings of Machine Learning Research, 202*, 337–371. https://proceedings.mlr.press/v202/aher23a.html

Zheng, L., et al. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *Advances in Neural Information Processing Systems, 36*. https://arxiv.org/abs/2306.05685
