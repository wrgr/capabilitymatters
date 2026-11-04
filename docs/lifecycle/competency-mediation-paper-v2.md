# Exploring Competency Mediation in Learning Engineering Through Scenario-Based Agentic Simulation

**Manuscript version 2: expanded mechanistic study and live-agent validation plan.** November 3, 2026. This revised manuscript supersedes the framing in [version 1](competency-mediation-paper-v1.md) for design discussion, while preserving v1 as a protocol record. Working manuscript; coauthor identity, participation and approval remain unconfirmed.

## Abstract

Learning engineering combines competencies whose contribution depends not only on team composition, but also on whether expertise is requested, exercised, and integrated into consequential design decisions. We propose a configurable agentic simulation instrument for examining this mediation under realistic organizational constraints. The instrument represents professional identity, competency profile, knowledge access, decision authority, and staffing availability separately. Its design conversations culminate in frozen interventions; a separate stateful environment subjects those interventions to matched routine, disruptive, and failure conditions, while learner-facing annotations and independent evaluation expose decision rationales. We distinguish competency **coverage**, **utilization**, and **integration** and argue that these mediators should be measured directly rather than inferred from job labels or eventual product quality. An initial mechanistic case models an AI-enabled logistics operation with three embedded practitioners and an optionally consultable learning scientist. A minimal nine-design run was extended to **240 surrogate designs** across three configurations, two organizational variants and 40 paired random seeds, producing **720** deployment observations. In the expanded surrogate, consultation occurs in approximately 43.8% of consultable runs and 90.0% of structured-integration runs. The synthetic environment exhibits a throughput–resilience tradeoff: in the hard condition, mean recovery is approximately 48.3, 56.1 and 70.6 across baseline, consultation, and integration, while mean throughput is approximately 98.4, 95.4 and 91.7, respectively. These are **outputs of authored decision policies and outcome rules, not observed human outcomes or independent language-model behavior**. The study provides a reproducible feasibility demonstration and a robustly specified program for dynamic multi-agent experiments, external adjudication, and educational testing.

**Keywords:** learning engineering; competency mediation; multidisciplinary teams; design science; human–AI teaming; scenario simulation; model validity; learning transfer.

## 1. The scientific question

Learning engineering is sometimes described as a profession, sometimes a process, and sometimes a collaborative practice. These accounts need not conflict. The professional title does not imply full coverage of the competencies a particular problem requires; a project can also enact learning engineering without appointing a person with that title. The relevant explanatory chain is:

**Scenario requirements → accessible competencies → participation and use → integration into decisions → intervention → performance under changing conditions.**

Two teams may possess the same expertise and produce different results because of decision rights, coordination, stakeholder access, or incentive conflicts. Two teams with different professional compositions may perform similarly because competence overlaps. An artificial agent that acts as an omniscient synthesizer can mask both phenomena. Therefore, our objective is to construct an inspectable research instrument that makes competence contributions visible and provides a controlled basis for exploring those alternative explanations.

The learning engineering flower is an initial eight-domain map, not a mandatory roster of eight agents (Ali et al., 2025). We represent each person with multiple domain proficiencies; domain breadth is not equivalent to specialist depth. Roles identify responsibilities and permissions, while availability identifies whether expertise is embedded, consultable at cost, or unavailable. The learning engineering integration process is a manipulable organizational condition and does not convey additional specialist knowledge.

## 2. Questions and pre-specified comparisons

**RQ1 (availability):** Does access to scenario-relevant specialist expertise change the questions asked, proposed intervention and deployment properties? **RQ2 (utilization):** How often does nominally accessible expertise actually produce decision-relevant contributions? **RQ3 (integration):** What does an explicit process of eliciting evidence, connecting learning mechanisms to operational constraints, and resolving objections add beyond the availability of the same expertise? **RQ4 (robustness):** How sensitive are apparent competency effects to organizational context, generative stochasticity, evaluation criteria, and inadvertent general-model compensation? **RQ5 (pedagogy):** Does interactive comparison improve learners' ability to diagnose missing expertise and explain intervention failures on an unseen case?

The primary between-design contrast is the paired difference in intervention behavior between conditions. The three stress levels constitute repeated tests on one frozen intervention. Consultation is a post-assignment process measure and should not be treated as an exogenous independent variable. Future research should analyze outcomes separately for capability, human concerns, and operational metrics; no fixed weighted grand score is justified.

## 3. Experiment architecture and competency contracts

A scenario world has both a public case brief and protected event/causal state. Design participants receive only the public evidence and the resources their roles are permitted to access. Each person has a professional identity, domain competency vector, relevant knowledge, project role, permissions, availability, and constraints. A consultation is an explicit decision and recorded event. Domain expertise can overlap; for instance, a training designer has some learning-science familiarity and a data scientist has some measurement expertise.

A conversation engine produces responsive, versioned dialogue, not isolated specialist essays. The coordinator can ask questions and track disagreements but may not issue substantive claims for absent specialists. Decisions are attributed to the actor and evidence that motivated them. Design conversations yield a frozen intervention record including actions, owner, costs, stated assumptions and evidence plan. The deployment engine then uses that exact frozen record across matched easy, medium and hard events. The expert evaluator inspects process and result separately and never edits the candidate intervention. Learning overlays describe assumptions, alternatives, and causal questions only to the learner, outside agent context.

**Competency-boundary validation is not solved by restrictive prompts.** Every generative run must retain an audit of information access, specialist action permissions, suspicious general-model compensation, and evidentiary support for specialized judgments. The strongest counterfactual tests will compare an embedded expert, the same expert consultable, the expert absent, and a resource-matched generalist. These checks should include expert-designed microtasks and human reviewers; observing an agent comply with a JSON schema is not a validity claim.

## 4. Organizational case and conditions

The fictional organization comprises three logistics facilities and 220 workers. Deployment of an AI dispatch assistant improves routine-case speed but worsens some exception handling and creates doubts about override decisions. Management has a seven-unit intervention budget and limits on removing workers from operations. The core team is an operations manager, a data scientist, and a workplace training designer. A learning scientist can be consulted. This cast is **scenario-specific**, not the recommended universal LE team.

Condition **A** provides the embedded team only. **B** makes a learning scientist consultable without mandatory use. **C** retains the same potential expertise but introduces a structured cross-disciplinary integration protocol, including explicit checks on evidence quality, capability transfer, operational feasibility, cost, and unresolved stakeholder concerns. The environment includes both routine operations and a staff-turnover variant. Participants can choose workflow changes, measurement, predictive alerts, brief practice, job aids, unassisted probes, fallback protocols and other proposals consistent with their configured expertise.

The condition may lead to lower routine throughput if it invests scarce budget in transfer and resilience. No condition is given an explicit universal outcome bonus. However, the current policy fixture **does** encode integration-dependent proposal, consultation and action-priority rules; all such effects are authored and cannot support external causal generalization.

## 5. Implementation and two stages of execution

### Minimal viable experiment

The first execution used **3 paired seeds × 3 conditions = 9** intervention designs, each tested in easy, medium and hard conditions (**27** deployment tests). The number of independent design units is nine, not 27. It exposed experimental machinery and a defect in the capability outcome field. That field was corrected in the committed generator and an automated test added to require finite numeric outcomes. The initial uncorrected capability summaries are excluded from interpretation; regression tests and the corrected reproducible outputs are the appropriate artifacts.

### Expanded mechanistic experiment

The expanded suite uses **40 paired seeds × 2 organizational variants × 3 conditions = 240** frozen intervention records, with **720** deployment observations. Independent policy randomness is seeded per case/variant, while matched deployment events share event-severity seeds across conditions. Recorded transcripts show proposal authors, consultation requests, commitments and freeze boundaries. Teaching overlays are attached to specific utterance identifiers and are not sent to simulated team members.

The evaluation harness audits authorized proposal origin, absent-consultation utterances, negative budgets, frozen intervention mutation, matched event seeds and replay equality. A dedicated Node test suite checks record counts, all four numeric outcome dimensions, consultation realism, replay identity and mechanistic evidence labeling. A GitHub Actions workflow executes both suites, performs those tests, and uploads complete results and traces as a reproducible artifact. **At manuscript freeze, successful completion of GitHub Actions has not been independently verified; the runner implementation and tests are committed, but CI status must be checked before claiming passed CI.**

### Mechanistic observations

| Configuration | Consultations / eligible design | Hard-condition recovery | Hard-condition throughput | Meaning |
| --- | ---: | ---: | ---: | --- |
| Embedded team | 0% | 48.29 | 98.42 | No specialist consultation available |
| Consultation possible | 43.8% | 56.06 | 95.36 | Some designs invoke expertise; uptake is not guaranteed |
| Structured integration | 90.0% | 70.60 | 91.67 | Integration increases consultation in the authored policy and shifts budget toward resilience |

These values are **synthetic index units**, not percent success rates, calibrated worker outcomes, or evidence that these professions actually behave this way. Values were obtained from the expanded mechanistic execution before the source field repair; **recovery, throughput and consultation fields are unaffected by the capability-field bug**, but the version-pinned CI output should be considered the canonical corrected evidence. Formal inferential tests are deliberately withheld because treatment behavior and outcome effects are programmatically constructed.

The numerical tradeoff illustrates a pedagogically useful phenomenon: investing in resilience can carry opportunity cost for routine throughput. But it is not a finding that integration causally improves resilience in actual organizations. In this fixture that mechanism was authored into the decision policy and event response functions.

## 6. Process observations and didactic overlays

A design conversation starts with a sponsor asking why dispatch exceptions remain problematic despite faster routine decisions. A data scientist questions aggregation of errors. A training specialist distinguishes walkthroughs from independent decisions and may request a learning scientist to inspect transfer. Depending on the condition and deterministic policy draws, that consultant may challenge reliance on completed training and recommend varied exception practice or delayed unassisted checks. Under structured integration, participants explicitly link transfer, staffing, workflow fallback, evidence, and budget before committing a frozen intervention.

A learner can explore one version, predict performance when the AI assistant fails, reveal the matched deployment outcomes, and compare counterfactual team configurations. Plain-language annotations identify uncertainties, assumed causal connections, and decisions that might require an unavailable expert. They are pedagogical overlays, not extra agent knowledge.

The pilot transcript is scripted at the level of policy templates, not a transcript from independent LLM participants. Future agentic claims require dynamic model-generated turns that are responsive to the preceding conversation, with retained raw call receipts, model identification, role input boundaries and no hidden synthesizer.

## 7. Robustness and validity plan

**Stage 1: verify implementation.** Treat software CI, numeric outcomes, hashes, role authorization, frozen invariants, event pairing, and replay exactness as acceptance gates, not research findings.

**Stage 2: remove policy circularity.** Replace authored condition-specific action preferences with independent LLM dialogue, while holding scenario state, role permissions, budget, accessible information, and turns constant. Run at least a balanced 2×2 manipulation of specialist access (available vs unavailable) and integration protocol (present vs absent). Include a condition where the relevant skill is partly covered by existing members. Assess whether consultable experts are invoked and whether their contributions survive into the frozen intervention.

**Stage 3: stress causal generality.** Test at least two materially different organizational cases and several hidden-cause settings, including cases for which learning interventions are unnecessary. Vary event severity, costs, staffing constraints, measurement noise, and simulator response rules. Use held-out events and adversarial disruptions with independent scenario adjudication. Check both favorable and unfavorable effects, not just improved mean scores.

**Stage 4: external assessment.** Obtain independent domain-specialist judgments on diagnostic quality, intervention validity, plausibility of environmental responses, and competency-boundary contamination. Blind raters where practicable, use predefined anchors, report agreement and unresolved cases, and separate technical correctness from human capability claims.

**Stage 5: learning study.** Compare an interactive replay-and-counterfactual activity against a high-quality static case. Measure learners' ability to identify missing expertise, explain causal tradeoffs and predict failures on a novel scenario, with delayed transfer assessment. Do not use satisfaction, model judge scores, or synthetic output indices as proxies for human learning.

This staged plan deliberately separates engineering validity, simulation plausibility, construct validity, causal inference and educational effectiveness.

## 8. Discussion

Treating the learning engineer as an omniscient fourth professional would erase the very differences this instrument seeks to study. A more defensible design separates competence from identity and explores how coordination influences the conversion of available knowledge into decisions. An expert may be unnecessary, consulted too late, ignored, expensive, or pivotal. Equally, a generalist can succeed within the constraints of the problem. Multiple plausible interventions must remain possible; the instrument should not force the learning-engineering configuration to win.

The pilot demonstrates that a source-bound, repeated, frozen-artifact study can be implemented and audited. Its central limitation is also its principal design lesson: **authored surrogates cannot validate how real competencies shape real dialogue**, even when the resulting comparisons look persuasive. The next empirical contribution requires calibrated competencies, independently generated dialogue, externally validated scenarios and human adjudication.

## 9. Conclusion

Competency coverage, utilization, and integration are distinct, testable mediators between scenario demands and learning engineering outcomes. The proposed simulation makes those mediators inspectable through realistic dialogue, role-appropriate consultation, frozen design decisions, and stress-conditioned deployment tests. A minimal and an expanded mechanistic study establish the research workflow, with strict limits on inference. The next version must determine whether these mechanisms remain observable and educationally useful beyond authored policy agents.

## Reproducibility and data availability

- [Experiment generator](https://github.com/wrgr/capabilitymatters/blob/main/tools/lifecycle/competency_pilot.mjs)
- [Automated integrity checks](https://github.com/wrgr/capabilitymatters/blob/main/tools/lifecycle/tests/competency_pilot.test.mjs)
- [GitHub Actions evidence workflow](https://github.com/wrgr/capabilitymatters/blob/main/.github/workflows/competency-mediation-pilot.yml)
- [Version 1 methodological manuscript](competency-mediation-paper-v1.md)
- [Historical dynamic-agent study](../../src/papers/flower-team-study.md), which is not part of the new three-condition treatment matrix.

## References

Ali, Z., Morehead, K., Jay, M., Arner, T., Lis, J., & Braitling, B. (2025). *Learning engineering is a team sport*. https://doi.org/10.59668/2109.21837

Aher, G., Arriaga, R. I., & Kalai, A. T. (2023). Using large language models to simulate multiple humans and replicate human subject studies. *Proceedings of Machine Learning Research, 202*, 337–371. https://proceedings.mlr.press/v202/aher23a.html

Epstein, J. M. (2008). Why model? *Journal of Artificial Societies and Social Simulation, 11*(4), 12. https://jasss.surrey.ac.uk/11/4/12.html

Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. *Journal of Management Information Systems, 24*(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302

Sandoval, W. A. (2014). Conjecture mapping: An approach to systematic educational design research. *Journal of the Learning Sciences, 23*(1), 18–36. https://doi.org/10.1080/10508406.2013.778204

Zheng, L., et al. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *Advances in Neural Information Processing Systems, 36*. https://arxiv.org/abs/2306.05685
