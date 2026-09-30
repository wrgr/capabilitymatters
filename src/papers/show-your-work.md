<!-- Canonical revised paper used by the HTML reading page and PDF build. -->

# Show Your Work

## Functional Evidence for Claims About Capability and Learning

**William Gray-Roncal and James Diamond**

**Working draft, revised September 30, 2026.** This revision develops the August grounding paper for Learning Engineering for Next-Generation Systems (LENS). It is a position paper, not a report of a completed effectiveness study or an adopted professional standard.

### Abstract

A finished product is evidence that something was produced. It is not, by itself, evidence of what a person learned, who supplied the necessary expertise, or whether the result will hold up in another setting. This distinction becomes especially consequential when artificial intelligence (AI) can contribute substantially to the product. We argue for demonstrated functional capability: claims about professional performance should be grounded in representative work, evaluated against explicit criteria under stated conditions. The assessment must distinguish the quality of the output, the capability of the person using available support, the learning that persists across time and tasks, and the contribution of the surrounding system. Drawing on assessment research, work-system design, and developing learning-engineering prototypes, we propose a practical evidence record linking each claim to its task, support conditions, observations, scoring, limitations, and decision. The contribution is a synthesis and a design proposal. Working prototypes illustrate its implementation; they do not establish improved learning, fairer decisions, or causal effectiveness. The central obligation is to show the work and explain what the evidence warrants.

### What changed since August

The original draft made the case for functional performance over unexamined credentials. That argument remains, but several claims needed correction. Demonstrations also require interpretation; successful work does not logically establish every underlying knowledge or skill; capability at the human-system interface has important precedents; and neither an authentic task nor a transparent score is automatically valid or fair. This revision adds AI-supported creation and assessment, explicit distinctions among output, capability, learning, and impact, and an evidence plan for testing the proposal. The original August PDF remains available as a separate version.

## 1. What the grade cannot tell us

Imagine a student who earns 40 percent on a chemistry examination and receives a B after a class-wide adjustment. The letter changes; the student's performance on those questions does not. But neither number, by itself, tells us whether the student can carry out the chemistry that matters. The examination could be poorly aligned, unusually difficult, or deliberately designed to discriminate among advanced students. A raw score is no more self-explanatory than a curved grade.

The problem is the unsupported inference. What claim does the result justify? Can the student explain a reaction, identify a hazardous procedure, troubleshoot an unfamiliar experiment, or perform the required laboratory work? Under what conditions, with which resources, and to what standard? A grade can summarize useful evidence. Trouble begins when the summary travels farther than that evidence allows.

The same question applies to a portfolio, a model benchmark, a certificate, or a successful demonstration. Each may inform a decision. None carries its interpretation automatically. Assessment research treats the connection between observed performance and a proposed use as an argument whose assumptions must be examined. Evidence-centered design similarly links the claim we want to make, the observations that would support it, and the tasks that could elicit those observations. [1, 2]

Our position is that consequential claims about the ability to do work should include evidence from representative work. This does not exclude knowledge tests, explanations, simulations, or formative checks. They can expose misconceptions and sample more broadly than a long practical task. The assessment should combine methods because of what each contributes to the claim, rather than treat one format as inherently sufficient.

## 2. Four claims that should not be collapsed

The August draft sometimes moved too quickly from successful output to capability, and from capability to learning. We now distinguish four claims. They concern different objects and require different evidence.

| Claim | What must be established | What one good artifact cannot establish |
| --- | --- | --- |
| Output quality | The product meets stated requirements in the tested conditions. | Who supplied the expertise or whether performance will repeat. |
| Capability in context | A person or team can perform representative work with specified support and constraints. | Performance with materially different tools, tasks, or conditions. |
| Learning | A relatively durable change attributable to experience, examined through later performance and appropriate comparisons. | Retention, transfer, or improvement from a single final submission. |
| Intervention impact | The intervention contributed to a valued outcome relative to a credible alternative. | Causation from an observed success or a before-and-after difference alone. |

These distinctions are practical. A team may deliver a useful dashboard while relying on one expert for all substantive interpretation. A learner may understand a problem but fail because the interface hides essential information. A tool may raise immediate performance without developing the capability needed when the tool is unavailable. Each situation deserves a different diagnosis.

Learning and immediate performance can diverge. The literature reviewed by Soderstrom and Bjork shows why smooth practice performance is an unreliable stand-in for durable learning. [3] For our purposes, this means that a successful demonstration supports a bounded performance claim. A learning claim also needs evidence of change, persistence, and the relevant form of transfer. No single waiting period or transfer task is adequate for every domain; the choice must follow the intended use.

We use **capability in context** to mean the capacity of a person, team, or human-system arrangement to accomplish specified work under stated conditions. This operational definition preserves the original paper's concern with real function without claiming that individual competence is unreal or that capability belongs only to an interface. The unit of analysis must be named before it is scored.

## 3. The person, the support, and the work system

Performance depends on more than what a person knows. Tools, staffing, time, information, incentives, authority, and coordination can enable competent work or prevent it. A training intervention is justified when the evidence supports a learning problem that training can address. It is not the default response to every disappointing result.

This systems perspective has substantial precedent. Carayon and colleagues' Systems Engineering Initiative for Patient Safety (SEIPS) model relates work-system components, processes, and outcomes, explicitly attending to their interactions. [4] Our contribution is to bring that perspective into the same assessment conversation as claims about learning and professional competence. We do not claim to have discovered the human-system interface or to have moved beyond all competency-based education.

Consider a proposed training course intended to reduce missed alerts. Before designing the course, examine whether alerts are accurate, interpretable, timely, routed to someone with authority, and feasible to act on. Training may help recognition or response. It cannot create missing staff, repair an unreliable data feed, or give someone authority that the organization has withheld. These are competing explanations to investigate, not conclusions to infer from the outcome alone.

We call this **gap attribution**: constructing and testing explanations for the difference between intended and observed performance. Useful evidence could include observations, interviews, system logs, work samples, and targeted changes to the workflow. The evaluator should record which explanations remain plausible. Finding a human contribution to failure does not remove a system contribution, and finding a system contribution does not establish that every individual skill is adequate.

The practical consequence is a wider set of permissible responses. Develop a skill, redesign a tool, change a handoff, provide a job aid, narrow the task, acquire better evidence, or stop. A justified decision not to deploy can be an example of capable work. An assessment that rewards only shipping a product would miss it.

## 4. Tasks organize evidence; they do not prove every enabler

The original paper used Knowledge, Skills, Abilities, and Tasks (KSAT) to distinguish the enabling capacities of a worker from the work itself. That distinction remains useful, but the vocabulary is not universal. For example, the National Institute of Standards and Technology (NIST) Workforce Framework for Cybersecurity, from the National Initiative for Cybersecurity Education (NICE), uses Task, Knowledge, and Skill statements in its 2020 revision. It should not be described as requiring the same four-part taxonomy. [5]

A task analysis should identify the work to be accomplished, its important variations, acceptable performance, and the resources ordinarily available. It can then identify the knowledge and skills likely to support that work. This gives curriculum and assessment a common reference. It does not justify the inference that completing a task proves possession of every hypothesized enabler.

There are many paths to the same output. A checklist can substitute for recall. A colleague can catch a mistake. AI can write code that its user could not write independently. A learner can reproduce a familiar solution without understanding when it applies. The resulting work may still be useful, but the claim about the person must be narrower than the claim about the product.

For example, someone who creates a functioning browser game with AI may demonstrate the ability to describe a desired experience, notice a defect, and guide a revision. That is meaningful work. It does not establish independent programming skill. Conversely, removing all support would be a poor assessment if the intended role is to direct and verify tool-assisted production. The assessment conditions should match the capability being claimed.

We therefore propose recording support explicitly: what the person did, what collaborators or tools supplied, what was checked, and what still depends on external help. Targeted explanation, diagnosis, and modification tasks can test uncertain inferences. These probes should be short and relevant; the aim is to establish the claim, not to require every person to reproduce every layer of the system.

## 5. Which outcome deserves to count?

A measurable outcome is not necessarily the right outcome. Completion, satisfaction, speed, eye contact, and a polished product can each be useful observations while remaining poor substitutes for the capability of interest. Choosing a criterion is a substantive decision about whose purposes the system serves and what tradeoffs are acceptable.

Begin with the work and the people affected. Define the intended benefit, the conditions in which it matters, unacceptable failure modes, and the parts of performance that cannot be reduced to a single total. A faster decision may be worse if it hides uncertainty or transfers work to someone else. A technically correct tool can fail if its intended users cannot access or understand it. The outcome should include what makes the work useful and responsible.

Distal outcomes, such as patient benefit or sustained workplace performance, matter. They are also influenced by many factors beyond a particular learner or intervention. Proximal evidence, such as a diagnostic explanation or a correctly executed procedure, can help locate mechanisms and guide feedback. Neither should automatically displace the other. Trace the proposed relationship between them and state which links have actually been examined.

The assessment should also distinguish a **construct** from its chosen measure. Engagement, for example, is not identical to looking at a screen or speaking frequently. Our MicroGPT teaching experiment makes this distinction visible through synthetic training data and deliberately constructed labels. It invites learners to inspect what a model is being asked to predict. It is an illustration of measurement choices, not empirical evidence about any culture or group. [10]

Fairness belongs in criterion selection, task design, access, and interpretation. Ask whether the task requires irrelevant language fluency, expensive equipment, prior coaching, or behavior associated with a narrow cultural expectation. Provide access and accommodations that preserve the intended construct. Examine subgroup results with attention to sample size and uncertainty, and provide a way to challenge the interpretation. Demonstration can support fairer decisions, but it is not automatically fair simply because the work is visible.

## 6. What counts as enough evidence?

**Decision-grade evidence** is evidence sufficient for a specified decision, given its consequences, uncertainty, reversibility, and available alternatives. It is not a universal score or a claim that maximal rigor is always affordable. A low-stakes prototype can proceed on limited evidence if the next step is bounded and informative. A consequential deployment requires a stronger account of reliability, failure, and recovery.

Evidence quality cannot be read from the source label alone. A randomized study, an investigation, an interview, and a software test answer different questions. A randomized study of the wrong outcome may contribute little to the decision at hand. A carefully documented failure can be enough to stop a release even when it cannot estimate the average effect of the intervention. Record study design, relevance, independence, limitations, and uncertainty alongside provenance.

The August draft leaned on a large case collection. Here we retain two bounded examples to show why the type and scope of the claim matter. They are illustrations, not a systematic review or a representative sample of successes and failures.

**A deployed model needs external evaluation.** Wong and colleagues evaluated the Epic Sepsis Model using 38,455 hospitalizations at Michigan Medicine. The hospitalization-level area under the receiver operating characteristic curve was 0.63; at a threshold of 6 or higher, the model failed to identify 67 percent of sepsis cases in that cohort. [6] These findings concern the model, setting, time period, and evaluation described in the study. They do not establish how every later version performs. They show why adoption and vendor-reported performance cannot replace evaluation in the setting where a decision will be made.

**A learning intervention is a package implemented over time.** The randomized evaluation of Cognitive Tutor Algebra I found no first-year effect and evidence of second-year benefit, statistically significant in high schools but not middle schools. [7] The intervention combined curriculum, software, and implementation. The study does not isolate the causal contribution of one learner-modeling algorithm. Nor does the year-two pattern, by itself, tell us which implementation mechanism produced it. A justified account keeps the package, timing, population, and outcome attached to the result.

For an individual assessment, sufficiency usually requires more than one polished work sample. Programmatic assessment provides a precedent for combining observations and judgments into a defensible decision. [8] Our proposed application is to sample meaningful variation across tasks, occasions, and support conditions, increasing the evidence burden with the breadth and consequences of the claim. Agreement among assessors helps, but agreement on a flawed criterion does not establish validity.

## 7. AI changes what we must observe

AI can contribute as a creative partner, a source of suggestions, a coding assistant, a tutor, or a provisional evaluator. In each role it changes the relationship between the visible artifact and the human contribution. The response should be to clarify the claim and inspect the relevant work, while preserving useful assistance where it belongs in the task.

Three conditions are often worth distinguishing. **Supported performance** asks what a person can accomplish with the tools available in the intended setting. **Independent performance** asks what that person can do without specified assistance when the role requires it. **Recovery performance** asks what happens when the support is wrong, missing, or misleading. These are proposed assessment conditions, not a requirement to remove all tools from every evaluation.

Process evidence can help explain an output. A sequence of revisions may show that a learner identified an error, checked a source, or rejected an inappropriate suggestion. It is still an incomplete record. An absent explanation in a transcript is not proof of absent understanding; important work may occur elsewhere. A longer transcript is not necessarily better evidence, and requesting private internal reasoning is neither necessary nor an appropriate substitute for observable explanations and decisions.

AI-assisted scoring adds another inference that needs evaluation. A plausible explanation for a score does not establish that the score is correct. We propose testing scorers against independently adjudicated examples, preserving disagreement, auditing performance on unfamiliar tasks and relevant groups, and rechecking after changes to the model, prompt, or rubric. Sources quoted as evidence must actually support the criterion. The human decision-maker needs a usable correction and appeal process, not merely the theoretical ability to override a score.

Calibrating that human judgment is part of the work. Raters should score common examples, explain consequential disagreements, and revisit the criterion when the disagreement exposes ambiguity. An expert reference set is a documented judgment, not an infallible answer key. Multiple AI ratings are not automatically independent evidence. These practices make uncertainty inspectable; their effects on decision quality still require evaluation.

## 8. Four developing examples

The following projects make the proposal concrete. They are author-associated artifacts and design examples, not independent validations of this paper. No learner-effect estimate is claimed for them here. Their appropriate role is to expose design choices and generate testable questions.

### Rainbow Bug Dash: authorship and creative judgment

Rainbow Bug Dash was co-created by Julian, age 6, with AI as a creative partner. The browser game asks the player to collect rainbows and avoid bugs. The companion Vibe Coding job aid, by James Diamond and Will Gray-Roncal, describes the cycle of expressing an idea, reacting to a working result, specifying changes, and testing the revision. [9]

The example broadens what can count as a contribution. Specifying that a character should begin in a safe place is a design judgment even when the person making it cannot implement the collision logic. The functioning game is evidence of a resulting artifact. The job aid documents aspects of an iterative process. Neither is a controlled measure of Julian's learning, proof of independent programming skill, or evidence that the approach works equally well for all children. A learning assessment would require an age-appropriate new task and observations of what the child can explain, choose, and revise over time.

### MicroGPT: inspect the data behind the result

The MicroGPT companion adapts Andrej Karpathy's small transformer implementation for a teaching interface. Its sequence moves from letters to haiku text to a synthetic bias example; users can inspect training data and compare character, word, and line tokenization. Live training and stored checkpoints make changes in model behavior available for inspection. [10]

The assessment opportunity is to ask learners to predict, test, and explain a change. What changed when the tokens changed? What did the training labels reward? Which result would justify revising the data rather than training longer? Successful interaction with the demonstration does not establish understanding. A useful follow-up presents different data and asks the learner to identify the same kind of problem without being shown the answer.

### Calibrated Judgment: a discrepancy prompts inquiry

Calibrated Judgment's design compares evidence in a finished essay with evidence available in the accompanying AI dialogue, linking criterion judgments to quoted material and routing selected decisions to an instructor. [11] The aim is to make the basis of assessment inspectable and allow corrections to inform later calibration.

A discrepancy between the two assessments is a reason to ask a better question. It is not a validated measure of over-reliance, deception, or lack of understanding. Missing transcript context, task differences, scorer error, and legitimately different evidence can also produce a gap. The next step should be a targeted clarification or performance probe before making a consequential claim about the learner.

### ExpertTrace: practice and transfer need separate tasks

ExpertTrace's design uses an operational knowledge corpus to support scenario-based practice and probe explanations at different levels of expertise. [12] It illustrates how an assessment can examine symptom interpretation, evidence use, uncertainty, and corrective action rather than reward recall of one finished answer.

The proposed evidence of learning would come from performance on unfamiliar scenarios, including cases in which a familiar cue is misleading or the support cannot be relied on. Repeating a practiced scenario can be useful instruction while remaining weak evidence of transfer. Working software and coherent simulated interactions establish implementation progress; learner gains require a study with learners and an appropriate comparison.

## 9. A practical evidence record

We propose a small evidence record for each consequential capability claim. It should be short enough to use and complete enough for another evaluator to question. The record is an author proposal developed from the assessment and systems principles above; it has not been validated as an assessment instrument.

| Element | What to record |
| --- | --- |
| Claim and use | The work, who or what is being assessed, and the decision the result will inform. |
| Conditions | Task variation, time, tools, AI, collaborators, accommodations, and relevant constraints. |
| Standard | Observable criteria, unacceptable errors, and how the performance level was established. |
| Evidence | Work products, observed actions, explanations, tests, and their provenance. |
| Interpretation | How observations support the claim; alternatives, missing evidence, and uncertainty. |
| Decision and review | The permitted next step, responsible decision-maker, appeal route, and reassessment trigger. |

A record might support this bounded claim: a learner can use an approved assistant to create a small browser tool, verify its stated behavior, explain two consequential design choices, and repair a seeded defect. Evidence would include the tool, its tests, the explanations, and the repair. The claim would not extend to independent software engineering, security assurance, or durable learning without additional evidence.

The same record can support a decision to withhold judgment. If authorship is unclear, a key test is missing, or the task is not representative, report the limitation rather than manufacture a precise score. Where a safety-critical criterion applies, a high total should not compensate for failing that criterion unless the decision rule explicitly permits that tradeoff.

The learning-engineering process should use the record throughout its cycle: understand the problem, model the relevant context, design, build, instrument, deploy within justified bounds, evaluate, and refine. These are revisitable activities, not a mandatory production line. Refinement often returns to understanding. New evidence may justify returning directly to a prior design choice, changing the point of intervention, or deciding that constraints make action inappropriate. The Capability Pipeline explorer offers a teaching simulation of these choices; its simulated outcomes are not empirical estimates. [13]

## 10. How to test the proposal

A position paper should specify what would make its claims less credible. The next studies should compare the proposed assessment approach with a clearly described alternative, rather than compare a richly supported intervention with an unspecified absence of support. The appropriate design depends on the question; the following is a research agenda, not a report of completed work.

First, test whether the evidence record improves the accuracy and usefulness of decisions. Independent raters could judge common work samples with and without access to the structured record. Outcomes should include justified decisions, consequential errors, unresolved cases, agreement, and time required. More agreement would not count as success if it simply reflected shared error. A separate adjudication procedure and tasks outside the development set are needed.

Second, distinguish supported productivity from learning. Assess relevant baseline performance, track what support was actually used, and examine later performance on new tasks. Use both supported and independent conditions where they match the intended claims. Include a recovery task when recognizing erroneous assistance is part of the work. Specify the primary outcome and analysis before examining results, and report uncertainty, missingness, and participation differences.

Third, examine whether the approach works for the people who would use it. Observe accessibility barriers, unequal preparation, rater disagreement, and differences in errors or burden across relevant groups. Invite affected learners and practitioners to review the construct and its operationalization. Small groups and sparse failures limit what can be concluded; an absence of detected disparity is not proof of fairness.

Fourth, test the operational cost. Record preparation time, scoring and adjudication effort, tool costs, appeals, privacy requirements, and maintenance after changes. A method that improves a narrow research task but cannot be sustained in the intended setting has not yet demonstrated the capability that adoption requires.

Finally, evaluate outside the development team. External assessors, new sites, unfamiliar tasks, and independent replication can reveal assumptions that internal testing misses. The proposal would need revision if added process evidence fails to improve decisions, imposes disproportionate burden, worsens disparities, or fails to predict relevant later performance. A useful outcome may be a narrower claim about where the method belongs.

## 11. Boundaries and responsibilities

Showing work creates records about people. Collect the evidence needed for the stated decision, explain its use, limit access and retention, and avoid treating continuous surveillance as the price of a credible assessment. Prefer selected work samples and targeted probes when they can answer the question. The ability to collect a behavioral trace does not establish a reason to use it.

Learning-engineering competence also includes the authority to act responsibly within a system. Who may change a criterion, deploy a tool, access a learner record, or overrule an automated recommendation? Those roles should be explicit. A responsible process preserves the possibility of escalation, correction, and stopping when the evidence is inadequate.

This paper is a proposed synthesis. It does not establish a new psychometric theory, a universally valid rubric, a causal estimate of learning gains, or an adopted credentialing standard. It does not represent a formal position of the Institute of Electrical and Electronics Engineers (IEEE) or its International Consortium for Innovation and Collaboration in Learning Engineering (ICICLE). Contributions to that community require review and agreement through its own processes.

The obligation we retain from the original draft is concrete: show representative work, state the conditions that made it possible, and connect the evidence to the claim. If the claim is learning, examine change and persistence. If it is operational capability, examine the work system. If it is impact, justify the causal inference. A credible assessment makes each of these judgments open to examination and correction.

## References and companion artifacts

1. Kane, M. T. (2013). Validating the interpretations and uses of test scores. *Journal of Educational Measurement, 50*(1), 1-73. [doi:10.1111/jedm.12000](https://doi.org/10.1111/jedm.12000).

2. Mislevy, R. J., Almond, R. G., and Lukas, J. F. (2003). *A brief introduction to evidence-centered design*. ETS Research Report RR-03-16. [doi:10.1002/j.2333-8504.2003.tb01908.x](https://doi.org/10.1002/j.2333-8504.2003.tb01908.x).

3. Soderstrom, N. C., and Bjork, R. A. (2015). Learning versus performance: An integrative review. *Perspectives on Psychological Science, 10*(2), 176-199. [doi:10.1177/1745691615569000](https://doi.org/10.1177/1745691615569000).

4. Carayon, P., Schoofs Hundt, A., Karsh, B.-T., Gurses, A. P., Alvarado, C. J., Smith, M., and Flatley Brennan, P. (2006). Work system design for patient safety: The SEIPS model. *Quality and Safety in Health Care, 15*(Suppl. 1), i50-i58. [doi:10.1136/qshc.2005.015842](https://doi.org/10.1136/qshc.2005.015842).

5. Petersen, R., Santos, D., Wetzel, K., Smith, M., and Witte, G. (2020). *Workforce Framework for Cybersecurity (NICE Framework)*. NIST SP 800-181 Rev. 1. [doi:10.6028/NIST.SP.800-181r1](https://doi.org/10.6028/NIST.SP.800-181r1). Cited for its Task, Knowledge, and Skill structure, not as a learning-engineering standard.

6. Wong, A., et al. (2021). External validation of a widely implemented proprietary sepsis prediction model in hospitalized patients. *JAMA Internal Medicine, 181*(8), 1065-1070. [doi:10.1001/jamainternmed.2021.2626](https://doi.org/10.1001/jamainternmed.2021.2626).

7. Pane, J. F., Griffin, B. A., McCaffrey, D. F., and Karam, R. (2014). Effectiveness of Cognitive Tutor Algebra I at scale. *Educational Evaluation and Policy Analysis, 36*(2), 127-144. [doi:10.3102/0162373713507480](https://doi.org/10.3102/0162373713507480).

8. Van der Vleuten, C. P. M., and Schuwirth, L. W. T. (2005). Assessing professional competence: From methods to programmes. *Medical Education, 39*(3), 309-317. [doi:10.1111/j.1365-2929.2005.02094.x](https://doi.org/10.1111/j.1365-2929.2005.02094.x).

9. *Rainbow Bug Dash*, co-created by Julian, age 6, with AI as a creative partner. [Play the game](https://capabilitymatters.org/rainbow-bug/). Diamond, J., and Gray-Roncal, W. *Vibe Coding: Building functional tools without writing code*. [Companion job aid, Word document](https://capabilitymatters.org/vibe-coding-job-aid.docx). User-supplied artifact and process illustration; no learning-effect study is asserted.

10. *MicroGPT for AI leaders*. [Teaching companion](https://capabilitymatters.org/microgpt/), adapted from [Andrej Karpathy's microgpt](https://karpathy.github.io/2026/02/12/microgpt/). Author-associated teaching prototype with synthetic examples.

11. *Calibrated Judgment*. [Project](https://calibratedjudgment.org/). Author-associated assessment prototype; cited for the design described here, not established effectiveness.

12. *ExpertTrace*. [Project](https://experttrace.org/). Author-associated scenario-practice prototype; cited for the design described here, not established effectiveness.

13. *The Capability Pipeline*. [Interactive explorer](https://capabilitymatters.org/capability-pipeline/). Author-associated teaching simulation, not an empirical outcome model.

14. Gray-Roncal, W., and Diamond, J. (2026). *Capability Matters: A Casebook*. [Companion draft](https://capabilitymatters.org/capability-matters-casebook-draft.pdf). A source of case framing; the empirical claims retained in this revision cite their primary studies directly.

### Acronym glossary

**AI:** artificial intelligence. **ICICLE:** International Consortium for Innovation and Collaboration in Learning Engineering. **IEEE:** Institute of Electrical and Electronics Engineers. **KSAT:** Knowledge, Skills, Abilities, and Tasks. **LENS:** Learning Engineering for Next-Generation Systems. **NICE:** National Initiative for Cybersecurity Education. **NIST:** National Institute of Standards and Technology. **SEIPS:** Systems Engineering Initiative for Patient Safety.

### Acknowledgment and revision status

We acknowledge the learning-engineering community, including IEEE ICICLE and the Learning Engineering Body of Knowledge, as important settings for the ongoing conversation about professional practice. This draft is offered for discussion and does not speak for those groups. Prepared with AI assistance. Working draft for author review and discussion.
