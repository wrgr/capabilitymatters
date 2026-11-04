# Exploring Competency Mediation in Learning Engineering Through Scenario-Based Agentic Simulation

## Three organizational case demonstrations and a research instrument for teaching and studying interdisciplinary design

**Working manuscript, version 3 · 4 November 2026.** Authors and affiliations remain subject to coauthor confirmation. This version **supersedes the single-case methodological framing of version 2**, not the historical dynamic-flower empirical record. The new three-case data are transparently identified as authored simulations; no unexecuted live multi-agent work is represented as completed.

### Abstract

Learning engineering depends on the integration of disciplinary competencies, but the relationship between the people on a team and the intervention that emerges is difficult to examine and teach. We describe a configurable agentic simulation instrument in which professional identities, competency profiles, project responsibilities, decision authority, and access to expertise are represented separately. We distinguish **competency coverage** (which expertise is accessible), **utilization** (which expertise is elicited and influences action), and **integration** (how contributions are reconciled with organizational, human, and learning objectives). Instead of treating a learning engineer as a universally knowledgeable specialist, the instrument represents learning engineering as an individual or collective practice appropriate to the problem. Three fictional settings illustrate its scope: AI-assisted logistics, a public-benefits service center, and control-room readiness. Each involves a different team, specialist availability, viable intervention choices, and easy/medium/hard deployment events. An executable, deterministic policy-agent casebook generates 36 design records and 108 frozen-design deployment tests, retaining conversation-like records, decisions, scenario tests, learner annotations, and explicit provenance. Software-level checks cover budget constraints, expert access, freeze integrity, matched events, and repeatability. The demonstrations illuminate possible tradeoffs and a failure of purely nominal leadership manipulation, but **do not measure the behavior of dynamically generated language-model agents or people**. We position the casebook as a reproducible teaching and instrument-design contribution, alongside requirements for a future evidence-based live-agent study. A larger factorial experiment is registered as an optional extension rather than a prerequisite of this paper.

**Keywords:** learning engineering; competencies; multidisciplinary collaboration; learning sciences; human-centered computing; systems engineering; agentic simulation; design science; organizational resilience.

## 1. Introduction

Learning engineering is simultaneously a body of competencies, a professional practice, and a way to organize interdisciplinary work. A technical team may possess the resources to solve an organizational capability problem but fail to request or apply relevant expertise. An ostensibly complete team may also fail because its contributors operate in parallel without integrating evidence, authority and operational constraints. Conversely, an individual with overlapping competencies may produce a successful intervention without a designated learning engineer. Counting professional titles, therefore, is not equivalent to explaining how a learning engineering solution emerges.

The *learning engineering flower* (Ali et al., 2025) provides a nonexclusive vocabulary for considering disciplinary contributions. It does not prescribe that all specialists be present on every project. We use the flower as a competency reference, while allowing scenario-dependent additions such as policy, accessibility, safety, or operations expertise. Our organizing question is: **How do accessible competencies and the ways teams use and integrate them shape design decisions, and how can a simulation make those mechanisms visible to learners?**

The proposed instrument is both a research tool and a teaching tool. The design conversation and its decision trail are as important as the final intervention. The subsequent deployment simulation creates situations in which the consequences of earlier assumptions can be examined. The goal is neither to show that a model can solve learning engineering problems automatically nor to engineer a demonstration where the learning engineer always wins.

## 2. Framework: competencies, roles, and integration

Four constructs must be distinguished. **Professional identity** is a background such as data scientist, instructional designer, learning scientist, systems engineer, or human-centered computing specialist. **Competency** is specific demonstrable expertise, which may overlap professional backgrounds and vary in depth. **Project role** describes responsibility, authority and the part of the problem an individual is charged to address. **Learning engineering practice** is the inquiry, design, integration, deployment and evaluation process that can be enacted by an individual or a team.

We distinguish three mediating processes. **Coverage** describes the extent to which expertise relevant to the scenario is available. **Utilization** describes whether it is requested, understood, challenged and actually used in a consequential decision. **Integration** describes how different contributions are reconciled into a feasible intervention serving learning, human and organizational goals. These are distinct: expertise can be available without being consulted; consulted without influencing the design; or integrated effectively despite incomplete specialist coverage.

A generalist or facilitator may coordinate a problem, recognize gaps, and request specialist assistance. They must not acquire an unearned capability simply because the underlying language model has broad pretrained knowledge. A later language-model realization should therefore separate role inputs, tools, authority, and audit evidence, while recognizing that instructions alone cannot remove model knowledge.

### Competency and staffing model

A **person** has profession, competencies and proficiency, information access, responsibilities, incentives, tools, and authority. A **team** has embedded staff, consultable specialists, unavailable resources, budget and consultation costs. A **scenario** has authentic-seeming requirements, observable evidence, hidden test state, stakeholders and multiple defensible responses. A **process** determines inquiry, dialogue, resolution, decision rights and iteration. Only people actually embedded or consulted may contribute specialist proposals. Scenario-dependent rules determine who must be involved: a benefits policy specialist or safety engineer may be mandatory even when a learning scientist is optional.

## 3. Instrument architecture

The instrument has two main phases. During **Design/Develop**, an agent team investigates a situation, asks each other questions, challenges evidence, consults or declines specialists, and commits intervention choices. All accepted messages, evidence sources, objections and unresolved assumptions are retained. The process ends with an **immutable frozen intervention** including intervention components, costs, owners and assumptions. During **Deploy/Test**, a separate stateful scenario engine presents routine, disruptive and failure events. It uses the frozen actions rather than asking an unbounded model to imagine or repair the solution retrospectively.

An independent evaluator should examine **process** and **result** separately. Process review asks whether expertise was used appropriately, uncertainty was handled, and decisions are traceable; result review asks how a frozen intervention fares in the supplied test conditions. Results should remain multidimensional: capability, human conditions, organizational performance, and resilience. None of these scores should be mistaken for a measured human learning outcome.

A **plain-language teaching overlay** can highlight a decision, ask a learner to predict its consequence, and explain where a specialist's contribution matters. It is presented only to the learner, never smuggled into the design agents' context. A learner can compare designs, inspect the origin of an intervention element, make a prediction about an unexpected event, reveal the stress test, and reflect on whether a different expert or coordination process would have changed the result.

## 4. Three settings: a case-based demonstration, not an artificial contest

All three cases are **fictional**, and action probabilities, action effects, scenario facts and operating constraints are **authored assumptions**. The cases are designed to probe the plausibility and teaching usefulness of the instrument. They are not presented as samples of actual organizations or evidence about disciplinary populations.

### 4.1 AI-assisted logistics: preserving independent judgment

A fictional logistics organization has 220 workers and three facilities. Routine dispatch decisions are faster following introduction of an AI assistant, but reported exceptions rise from 11% to 17%. The change in measurement and case mix means the trend alone cannot establish that the AI caused the problem. The embedded project team comprises an operations manager, data scientist and workplace training designer. A learning scientist is consultable, not automatically present.

Three illustrative configurations are an embedded team; the same team with optional learning-science consultation; and optional consultation supported by explicit cross-disciplinary integration. The conversation must distinguish a training deficit from shift-ownership problems, system usability and automation dependence. Candidate interventions include mapping handoffs, defining override and escalation responsibilities, segmenting metrics, brief exception rehearsal, job aids, varied transfer practice and independent delayed checks. Easy deployment covers routine operations; medium introduces staff turnover and rising exceptions; hard removes the AI assistant during a surge.

The teaching question is whether faster assisted performance can coexist with poorer independent judgment, and what evidence would reveal the distinction.

### 4.2 Public-benefits service: accessibility and organizational performance

A fictional benefits service center improves simple-case turnaround through a self-service interface but has rising repeat contacts and complaints about language access. Its core team includes a service director, a benefits policy specialist, a human-centered computing professional and a service data analyst. The specialist in language access and accessibility is optionally consultable. Policy interpretation cannot be delegated to the simulated interface or altered by design agents.

The configurations explore service-operations framing, human-centered computing framing, and consultation with a language-access specialist plus explicit integration. Possible designs include human escalation, approved plain-language explanations, participatory service design, measuring abandonments and repeat contacts, a triage classifier with guardrails, and non-digital alternatives. The hard event is an automated system incorrectly closing ambiguous cases.

The teaching question is why organizational throughput measures, user-centered experience and actual service resolution can diverge, and how an apparently helpful workflow can shift costs onto the people it serves.

An important negative control emerged in the authored fixture: **merely changing the declared lead from service director to human-centered specialist, without changing procedural behavior or priorities, produced the same selected actions and deployment outcomes**. This should not be described as evidence that leadership has no effect. It establishes that the simulator must operationalize leadership and authority rather than rely on professional labels.

### 4.3 Control-room readiness: reliability under automation failure

A fictional utility introduces an AI alert prioritizer in a simulated control room. A safety engineer, experienced operator, systems engineer and training specialist form the core team; a learning scientist is optionally consultable. A safety engineer and operational domain specialist are mandatory for the simulation's release decisions. All activity remains synthetic; no live utility system is involved.

Candidate interventions include stale-sensor checks, stop and escalation authority, fault-injection rehearsals, unassisted alarm sorting, guided practice, and delayed diagnosis trials. The hard event combines cascading alerts with a simulated communications dropout. Faster acknowledgement is not automatically evidence of better diagnosis. Here, independent transfer and reliable fallback may be more consequential than routine efficiency.

The teaching question is how system engineering, operator expertise, learning mechanisms and assessment of independent capability must work together without any one specialist presuming to replace the others.

## 5. Reproducible mechanistic demonstration

The casebook was executed with a deterministic authored policy engine, rather than independently generated LLM agents. Each action is associated with an authorized role, fixed resource cost, proposal likelihood, priority and explicitly assumed contribution to four synthetic outcome indices. Conditional consultation is seeded but not guaranteed. Integration modifies elicitation and selection priorities without adding new specialist-only actions. Short natural-language records are produced from authored response templates. The frozen intervention is tested against case-specific easy, medium and hard events, each matched to the same seed across that case's configurations.

The casebook contains **three settings × three illustrative configurations × four seeds = 36 design records** and **108 deployment observations**. There are nine first-seed example transcripts, one per case/configuration. The 108 tests represent three stress conditions applied to each of the 36 designs; they are not 108 independent design teams. All program inputs, transcripts, actions, outcomes and test events are available in the machine-readable archive.

The validation checks included: no spending beyond the scenario budget, no proposals attributed to unavailable consultants, no authorization violations, preserved frozen intervention hashes, matched deployment event keys, and three test levels for every design. These checks passed in the generated records; automated tests and GitHub CI reproduce the result. They establish software invariants, **not simulation realism or construct validity**.

### 5.1 Selected synthetic hard-event summaries

| Scenario and configuration | Specialist consultation | Capability index | Human conditions | Organizational performance | Resilience |
| --- | ---: | ---: | ---: | ---: | ---: |
| Logistics, embedded only | 0/4 | 58.00 | 55.75 | 91.25 | 48.25 |
| Logistics, consultable | 0/4 | 58.00 | 55.75 | 91.25 | 48.25 |
| Logistics, integration | 4/4 | 85.50 | 61.25 | 83.25 | 71.25 |
| Benefits, operations framing | 0/4 | 57.25 | 69.00 | 96.75 | 55.00 |
| Benefits, HCC framing | 0/4 | 57.25 | 69.00 | 96.75 | 55.00 |
| Benefits, accessibility consultation | 2/4 | 62.25 | 94.50 | 82.50 | 77.75 |
| Control room, operations core | 0/4 | 80.50 | 60.25 | 66.25 | 102.25 |
| Control room, training consultation | 1/4 | 80.50 | 59.75 | 66.00 | 102.50 |
| Control room, safety integration | 3/4 | 91.25 | 60.75 | 62.25 | 112.25 |

*All indices are synthetic, arbitrary-scale (bounded 0–150) outputs of authored rules. The small four-seed cells are illustrations, not estimates of effect or probability. The displayed consultation fractions reflect deterministic sample draws, not observed professional behavior.*

Within the authored model, attention to resilience or accessibility sometimes draws resources away from near-term throughput. In other conditions an optional consultant is never engaged, so its theoretical availability does not affect the intervention. The behavior of these examples is *defined by the proposed policy and outcome assumptions*. We cannot infer from them that integration, accessibility or learning science would produce analogous benefits in an actual organization.

### 5.2 Dialogue, provenance, and teaching use

A learner could encounter this statement from the logistics scenario: “The assistant tells us what to do until the case is strange. Then nobody agrees who owns the call.” The accompanying overlay asks whether the failure is in knowledge, workflow authority, or automation dependence. The learner compares adopted actions and predicts the outcome of an assistant outage before revealing the frozen-artifact test.

For benefits service, the prompt asks why reporting case closures may hide abandonment and repeat contacts. For control-room readiness, learners distinguish rapid acknowledgement from independent diagnosis when the alert system supplies misleading evidence. Each overlay links to recorded message identifiers. The learner's explanatory task is to identify which competence or coordination mechanism changed an actual design decision, not merely to identify a professional who was on the team.

The current demonstration produces inspectable **illustrative conversations**. A genuine live-agent study must use model-generated, responsive dialogue with recorded provider/model details, complete allowed context, stable role-specific access, failure receipts and an independent reviewer. The present simulation does not provide that evidence.

## 6. Limits and validity agenda

**Professional realism.** The generated voices are policy templates, not verified accounts of how a data scientist, learning scientist, human-centered computing specialist or systems engineer would reason. Future designs should enlist practitioners in writing and reviewing the scenarios and judgments.

**Causal realism.** The simulator has authored action effects and simplifications. Its indices do not represent worker capability, benefits access, safety or organizational performance, nor are they calibrated to field data. Scenario truth may be hidden from design agents but must remain independently testable.

**Competency boundaries.** Instructions and nominal access control do not erase the broad pretrained expertise of a powerful LLM. To prevent omniscient compensation, live-agent runs need held-out competency probes, access checks, specialist signoff and independent audits for unauthorized synthesis.

**Evaluation.** Model reviewers can provide structured criticism but can also share biases and knowledge with design agents. A subset of real live-agent records should be evaluated by independently recruited, qualified human reviewers, blind to the team configuration when possible. Review should separate decision quality, process, and simulated outcome evidence. Inter-rater disagreement belongs in the analysis.

**Educational effectiveness.** Learner interest or predicted outcome indices are not evidence of learning. A future learner study can compare interactive exploration to a strong static case and assess novel-case competency diagnosis, tradeoff reasoning, intervention choice and delayed transfer.

**Experimental depth.** A large factorial design is unnecessary to demonstrate that the instrument can express multiple meaningful settings. An optional **prospective factorial register** is retained for later work: specialist availability, embedded versus consultable status, integration processes, authority distributions and competency overlaps can be varied when causal attribution becomes the research goal. No factorial effects are reported here.

## 7. Discussion

Three design principles follow from the proposed instrument. First, competency needs arise from the organizational situation, not from a universal roster of specialists. Second, access to expertise and the actual use of expertise must be recorded separately; neither availability nor professional identity guarantees that an intervention reflects a particular discipline. Third, tests should examine the consequences of a **frozen intervention** under changing conditions; a sophisticated model should not automatically fix the design during deployment.

These principles enable an unusual teaching activity: learners can inspect different teams’ reasoning, locate where expertise mattered or was ignored, predict failures, and explain whether a different arrangement of competencies or authority would plausibly improve the outcome. The casebook intentionally includes cases where learning intervention is not necessarily the appropriate first choice.

The instrument could support both professional preparation and research on multidisciplinary design, but the empirical claims must remain narrower than its promise. This study demonstrates *instrument feasibility and inspectable illustrative cases*. It does not yet demonstrate emergent agent teamwork, authentic professional competency differences, causal mediation, or benefits to learners.

## 8. Conclusion

Learning engineering is best represented in the simulation not as an omniscient fourth specialist but as the interplay of **scenario-relevant expertise, meaningful opportunities to contribute, and integration across human, learning and organizational goals**. Three case settings and their stress tests illustrate how to make those relationships inspectable. The next research milestone is an authentic live-agent multi-case study with calibrated domain bounds and external assessment; a comprehensive factorial decomposition can remain a later extension.

## Source materials and provenance

- [Three-case specification](https://github.com/wrgr/capabilitymatters/blob/main/src/data/lifecycle/competency-casebook-v1.json)
- [Multicase runner](https://github.com/wrgr/capabilitymatters/blob/main/tools/lifecycle/competency_casebook_runner.mjs)
- [Frozen interventions, transcripts, learner overlays, and stress tests](https://github.com/wrgr/capabilitymatters/blob/main/data/lifecycle/competency-casebook/observations-v1.json)
- [Regression tests](https://github.com/wrgr/capabilitymatters/blob/main/tools/lifecycle/tests/competency_casebook.test.mjs)
- [Reproducibility workflow](https://github.com/wrgr/capabilitymatters/blob/main/.github/workflows/competency-casebook.yml)
- [Previous single-case manuscript (v2)](competency-mediation-paper-v2.md)
- [Historical dynamic-agent study](../../src/papers/flower-team-study.md), a separate dataset and paper that is not the three-case treatment matrix.

**AI use and evidence statement:** This manuscript and its demonstrations were developed using AI assistance. All reported three-case conversations and stress outcomes were produced by explicit, authored policies. No human outcomes and no independently generated agent dialogue were collected in the three-case demonstration. All counterfactual performance differences are artifacts of the programmed model and should not be interpreted as effects in professional teams.

## References

Ali, Z., Morehead, K., Jay, M., Arner, T., Lis, J., & Braitling, B. (2025). *Learning engineering is a team sport: Collaborative explorations for team building strategies with short scenarios in various contexts.* https://doi.org/10.59668/2109.21837

Aher, G. V., Arriaga, R. I., & Kalai, A. T. (2023). Using large language models to simulate multiple humans and replicate human subject studies. *Proceedings of Machine Learning Research, 202*, 337–371. https://proceedings.mlr.press/v202/aher23a.html

Epstein, J. M. (2008). Why model? *Journal of Artificial Societies and Social Simulation, 11*(4), Article 12. https://jasss.surrey.ac.uk/11/4/12.html

Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. *Journal of Management Information Systems, 24*(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302

Sandoval, W. (2014). Conjecture mapping: An approach to systematic educational design research. *Journal of the Learning Sciences, 23*(1), 18–36. https://doi.org/10.1080/10508406.2013.778204

Zheng, L., et al. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *Advances in Neural Information Processing Systems, 36*. https://arxiv.org/abs/2306.05685
