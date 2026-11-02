# Exploring the learning engineering flower with agentic simulation

William Gray-Roncal<sup>1</sup> and Jodi Lis<sup>2</sup>

<sup>1</sup> Johns Hopkins University, School of Education; wgr@jhu.edu

<sup>2</sup> IEEE ICICLE; jodillis@gmail.com

**Abstract.** We examine an agentic simulation organized around the learning engineering flower. Five conditions compare a full team, domain omission, responsibility withdrawal, member removal, and one actor with matched work slots. Fifteen runs in one fictional feedback-conversation scenario produced 588 accepted responses. Fourteen candidates were eligible; 26 of 28 model reviews passed validation, yielding twelve complete paired results. Separate rubric indices concern human flourishing support, system performance, and learning. Observed means did not establish a consistent full-team advantage; learning indices varied within conditions, and missing reviews limited comparisons. Browser observations showed both choice-dependent explanations and static self-review criteria within the full-team condition. The study identifies inspectable implementation differences; it does not measure human learning or establish which expertise human teams need.

**Keywords:** learning engineering; team competencies; agentic simulation; design evaluation

## Introduction

Learning engineering combines expertise around a shared challenge, with team composition changing as work develops (Ali et al., 2025). The practical question is whether those contributions reach a solution's design, implementation, and evaluation. Representation alone does not establish influence.

Agentic approaches already generate interactive learning experiences and training resources (Gröner et al., 2026; Ryng & Suhr, 2026). We use a complete design cycle to examine whether changing explicit responsibilities or work allocation changes a generated solution. Modeling can expose assumptions and guide inquiry without forecasting human behavior (Epstein, 2008). The resulting comparisons should identify inspectable design decisions and questions for empirical study.

## The Flower Framework

Following the flower framework (Ali et al., 2025), the preset uses eight expertise domains (Table 1), with shared understanding at the center and connections to learners and other stakeholders. Further expertise may be needed as a challenge changes. Every member retains responsibility for those concerns. Instructions require members to separate supplied case facts, assumptions, and information needed from people. Identity, domain instructions, behavior, authority, and stage participation remain distinct. These editable instructions express requested contributions; they are not validated measures of professional proficiency or a substitute for involving learners.

**Table 1.** *Flower domains and illustrative contributions*

| Source domain | Requested contribution in this simulation |
| --- | --- |
| Learning Sciences | Learning mechanisms, prior knowledge, practice, retention, and transfer |
| Learning Experience Design | Learner journeys, activity structure, feedback, and revision |
| Data Science | Data quality, analysis, uncertainty, and model assumptions |
| Assessment, Measurement, Evaluation | Constructs, measures, comparisons, and limits of inference |
| Learning Environment Engineering | Operating environment, dependencies, access, and recovery |
| Software Engineering | Executable behavior, state management, testing, and maintenance |
| Subject-Matter Expertise | Content accuracy, authentic tasks, and consequential errors |
| Education and Training Professionals | Facilitation, learner support, adoption, and delivery conditions |

## Study Design

The fictional scenario asks for a browser resource that helps new team leads distinguish observation from assumption, ask a clarifying question, and propose a feasible next step. A missed handoff provides initial practice, followed by a changed situation. Cases must remain fictional, avoid employee rankings and personal records, allow skipping or revision, and work on shared laptops. At Design, a fixed challenge reduces available first-session time from twenty minutes to five while retaining the implementation date. The five-minute constraint is a design requirement, not observed completion time.

The baseline has eight domain members and a coordinator. Assessment, Measurement, Evaluation is additionally assigned to the Data Science member, creating declared overlap without adding work slots. The full-team condition preserves this configuration. Global omission removes explicit assessment domain instructions from all members. Member withdrawal removes them only from the primary assessment member, leaving the overlapping assignment intact. Member removal withdraws that primary member and its four contributions. The one-actor condition assigns one generalist identity to the same contribution and decision slots, with the corresponding domain duties and authority. Shared understanding is operationalized through common bounded records and duties to expose assumptions, disagreements, and decisions. All conditions retain this mechanism; the study does not test its presence against absence or measure a shared cognitive state.

Each condition was scheduled three times. The full team, global omission, member withdrawal, and one actor each had forty calls; member removal had thirty-six. The planned total was 588 generation calls across fifteen candidates. Case facts, shared responsibilities, stage order, model settings, and accepted-response limits remained common. Call opportunities were matched except in member removal. Matching calls and output bounds does not match actual input tokens, output tokens, elapsed time, or compute.

## Execution and Evaluation

The stages were Understand, Map, Design, Build, Instrument, Experiment, Evaluate, and Refine. We used gpt-6.1-sol at low reasoning effort, a 48,000-character accepted-response bound, and a 240-second call timeout. Fresh calls received up to ten recent contribution and coordinator-decision records, clipping message, decision, and body fields to 1,800 characters each; shared artifact bodies and prior HTML were bounded at 9,000 and 12,000. Condition dispatch was shuffled within each five-run block (seed 20261102); the next block waited for all runs to terminate. There were no retries or replacement runs. Revisit requests added neither calls nor rebuilt HTML.

Before ratings, eligibility required a retained completed chain matching the batch head. Completed primary journals were copied exactly. An exact prefix of a complete retained JSONL stream permitted a separately labeled evaluation view using unchanged metadata after chain and head verification. A candidate without either completed representation was excluded without rerun. Originals, discrepancies, and derivation hashes were retained.

Assignment-masked full-solution packets contained the task, rubric, exact Build, browser observations, and the latest integrated record from each stage. Generated plans were labeled separately; proposed repairs received no implementation credit without Build or observation support. Raw conversations and assignments were withheld; artifact and plan wording remained intact.

Fresh offline contexts at desktop and two mobile widths recorded load/runtime errors, initial overflow, automated accessibility findings, eight Tab presses, and screenshots. Five desktop flows examined initial practice/feedback, revision, changed situation, skip, and clear/reset. Fixed inputs and choice rules allowed source-specific locators. The common protocol was frozen at 16:35:39 UTC on 2 November 2026, during generation; the harness was frozen at 16:42:23, before candidate QA. This was not a preregistered study. Source, Build, and journal hashes bind the observations. Unexecuted checks remain explicit.

Each eligible candidate received two fresh reviews from the generation model in shuffled opaque packet order, with five workers and a thirty-invocation ceiling. Each job had an empty working directory, strict schema, no tools, and one attempt. Invalid responses, nonmatching quotations, tool activity, or incomplete receipts left ratings unknown without retry. Exact quotes establish source fidelity, not judgment validity.

**Table 2.** *Evidence-based scorecard dimensions*

| Dimension | Criteria |
| --- | --- |
| Human flourishing support | Agency and dignity; access and inclusion; manageable burden |
| System performance | Technical correctness; reliability and recovery; implementation viability |
| Learning | Capability alignment; practice and feedback; independent assessment and transfer support |

Nine criteria were rated 0–4. Each dimension index is 25 times its three-criterion mean. Candidate indices average the two reviews only when both supply all three scores; otherwise they remain unknown. Dimensions have no combined total. Reviews were frozen before assignment reveal. We report candidate values, condition means and sample standard deviations, known counts, disagreement, and descriptive full-team differences. Simulated outcomes and Monte Carlo probabilities were disabled.

## Results

The batch reported fifteen completed runs and 588 accepted responses, with no schema violations. Fourteen candidates were eligible: thirteen exact primary copies and one verified event-stream extension. Member withdrawal repetition 3 lacked a retained completed chain and was excluded before review. Of twenty-eight review attempts, twenty-six passed validation. One omission repetition-2 review failed exact-source quotation matching; one full-team repetition-2 review lacked a completed-turn receipt. Those candidates' paired indices remain unknown, leaving twelve complete paired results. No failure was replaced or scored zero.

**Table 3.** *Descriptive results by condition*

| Condition | Reviewed / planned | Human flourishing support | System performance | Learning |
| --- | --- | --- | --- | --- |
| Full team | 3 / 3 | 62.5 (5.9) n = 2 | 58.3 (5.9) n = 2 | 72.9 (14.7) n = 2 |
| Global omission | 3 / 3 | 70.8 (5.9) n = 2 | 64.6 (2.9) n = 2 | 77.1 (8.8) n = 2 |
| Member withdrawal | 2 / 3 | 70.8 (5.9) n = 2 | 56.3 (2.9) n = 2 | 62.5 (5.9) n = 2 |
| Member removal | 3 / 3 | 66.7 (4.2) n = 3 | 59.7 (4.8) n = 3 | 69.4 (10.5) n = 3 |
| One actor | 3 / 3 | 73.6 (2.4) n = 3 | 59.7 (2.4) n = 3 | 77.8 (10.5) n = 3 |

Index cells show mean (sample SD); n is the number of candidates with complete paired ratings. Indices range from 0 to 100 and describe rubric judgments. Reviewed means two attempts, not two valid reviews. Each condition had three planned candidates; repeated judgments do not increase that sample. Values are rounded to one decimal.

Learning means were 72.9 for the full team, 77.1 for omission, 62.5 for withdrawal, 69.4 for removal, and 77.8 for one actor. Differences from the full team were therefore +4.2, −10.4, −3.5, and +4.9. Full-team and one-actor learning indices each spanned 20.8 points across available repetitions. Removal was below the full team in repetition 1 and above it in repetition 3. Available repetitions differ across conditions, especially withdrawal and the full team; these are not matched-effect estimates.

All fourteen eligible Builds had source-bound browser evidence: forty-two initial viewport checks and seventy observed flows, covering all five flows per candidate. Recorded sessions contained no runtime exceptions, initial overflow, or automated axe violations. Initial checks and observed flow completion do not establish instructional quality or human outcomes.

Across 108 known paired criterion ratings, 91 agreed and 17 differed by one point; eighteen pairs were unknown. Mean absolute disagreement was 0.16 on the 0–4 scale. Eight disagreements concerned reliability and recovery. This agreement describes repeated judgments from one model, not independent validation of the rubric or the generated solution.

## Discussion

The full-team repetitions illustrate implementation variation within one assignment. Repetition 1 used choice-dependent explanations; two explanations changed after revised choices. Repetition 3 accepted separate free-text revisions while retaining three static self-review criteria, explicitly labeled as not assessing the text. Its changed case added a new fact while preserving the common paragraph. Learning indices were 83.3 and 62.5, respectively; both reviews rated practice/feedback 4 for repetition 1 and 2 for repetition 3. These observations distinguish design mechanisms without showing that a single feature caused the index difference or improved learning. Unchanged guidance is not automatically a defect.

The condition means do not identify a necessary domain or a stable team advantage. Explicit assessment omission still produced candidates with assessment-related features, while the one actor retained the scheduled domain duties. Overlap permits compensation but does not prove it occurred. A useful next study would hold the task and artifact structure constant, trace which contributions reach implementation, and test response-dependent explanations against self-review with intended learners. Independent performance and burden would need direct observation. Generated Refine plans are proposals; they did not change the evaluated Builds.

Software behavior and learning claims require different evidence. A trace can establish an implemented interaction, while comprehension, transfer, burden, and adoption require observations with people. This follows the distinction between how a design functions and how its functions produce learning (Sandoval, 2014). Further contexts are needed to examine when a contribution matters (Dede, 2026). Any repaired artifact should receive a new version and assessment.

## Limitations

One fictional scenario and three scheduled repetitions per condition support a descriptive pilot. Attrition leaves only two or three complete paired candidates per condition. Shuffled concurrent dispatch does not eliminate provider timing or model variation. The same model generated solutions and supplied twenty-eight repeated review attempts. Same-model judge bias remains possible (Zheng et al., 2023), and intact artifact wording may reveal assignments. No human learning outcomes or independent human ratings were collected.

Ablation changes instructions, not pretrained knowledge or the common output interface. Assignment does not establish proficiency; simulated agents may distort human behavior (Aher et al., 2023). Member removal also reduces call capacity. Automated checks cover recorded states and actions only. Five runs had inconsistent journal representations; one needed the verified extension and one was excluded. Twenty-eight of 588 generation responses lacked complete provider receipts (twenty-five empty, three incomplete). Available usage totals cover only 560 responses, so they do not establish total consumption. These gaps and the two failed reviews constrain interpretation.

**Acknowledgments.** The authors acknowledge support from the LENS program.

**Data availability.** Public study materials at https://capabilitymatters.org/agentic-le/flower-study/ comprise frozen results, raw ratings, audit notes, exact Build sources, and the figure. Code: https://github.com/wrgr/capabilitymatters. Complete generation, provider, and review journals, packets, assignment keys, and QA screenshots are retained privately.

**Use of artificial intelligence.** Artificial intelligence assisted software development, generation, drafting, technical observation, and artifact assessment.

## References

Aher, G. V., Arriaga, R. I., & Kalai, A. T. (2023). Using large language models to simulate multiple humans and replicate human subject studies. *Proceedings of Machine Learning Research, 202*, 337–371. https://proceedings.mlr.press/v202/aher23a.html

Ali, Z., Morehead, K., Jay, M., Arner, T., Lis, J., & Braitling, B. (2025). Learning engineering is a team sport: Collaborative explorations for team building strategies with short scenarios in various contexts. *International Consortium for Innovation and Collaboration in Learning Engineering (ICICLE) 2024 Conference Proceedings: Solving for Complexity at Scale*. https://doi.org/10.59668/2109.21837

Dede, C. (2026). What works when for whom under what conditions: Learning engineering as an enabler of component-based research. *Proceedings of the Learning Engineering Research Network Convening*. https://doi.org/10.59668/2551.25412

Epstein, J. M. (2008). Why model? *Journal of Artificial Societies and Social Simulation, 11*(4), Article 12. https://jasss.soc.surrey.ac.uk/11/4/12.html

Gröner, F., Verma, A., & Bronowitz, J. (2026). Automatically generating interactive learning experiences with an LLM-driven agentic pipeline. *Proceedings of the Learning Engineering Research Network Convening*. https://doi.org/10.59668/2551.25387

Ryng, H., & Suhr, D. (2026). Learning engineering by design: An agentic AI application for rapid, personalized health & safety training in disaster response and hazardous environments. *Proceedings of the Learning Engineering Research Network Convening*. https://doi.org/10.59668/2551.25171

Sandoval, W. (2014). Conjecture mapping: An approach to systematic educational design research. *Journal of the Learning Sciences, 23*(1), 18–36. https://doi.org/10.1080/10508406.2013.778204

Zheng, L., Chiang, W.-L., Sheng, Y., Zhuang, S., Wu, Z., Zhuang, Y., Lin, Z., Li, Z., Li, D., Xing, E. P., Zhang, H., Gonzalez, J. E., & Stoica, I. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *Advances in Neural Information Processing Systems, 36*. https://arxiv.org/abs/2306.05685
