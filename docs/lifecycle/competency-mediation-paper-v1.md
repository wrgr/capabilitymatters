# Competency Availability, Utilization, and Integration in Learning Engineering: A Simulation Research Instrument

**Manuscript version 1: protocol lock and minimal viable experiment.** November 3, 2026. Working methodological manuscript for coauthor review; authorship and affiliations to be confirmed. This version is not a report of empirical learning gains.

## Abstract

Learning engineering problems often depend on multiple forms of expertise, but professional titles alone do not determine which competencies are available, used, or integrated into a solution. We describe a scenario-driven agentic simulation research instrument for investigating how different competency configurations shape problem framing, intervention design, and performance under changing organizational conditions. The instrument distinguishes professional identity, competency proficiency, scenario-specific knowledge, project responsibility, and decision authority. It represents specialists as embedded, consultable, or unavailable, while preserving overlapping competency coverage and allowing learning engineering to be practiced by an individual, an integrator, or a multidisciplinary team. Dynamic design conversations produce a versioned intervention that is frozen before easy, medium, and hard deployment conditions are disclosed. The evaluation separately examines competency coverage, utilization, integration, and simulated outcomes for learning, human flourishing, and organizational performance. As a minimal mechanistic demonstration, we implement a fictional logistics AI-assistant rollout with an operations manager, data scientist, workplace training designer, and optionally consultable learning scientist, comparing baseline, consultative, and structured-integration conditions. The executed deterministic policy-agent fixture comprises nine design records and 27 deployment records; it verifies a reproducible experimental contract but **does not constitute fresh language-model agent execution, a validated competency manipulation, or evidence of human learning**. The instrument and preregisterable contrasts provide a foundation for a subsequent live-agent study and classroom evaluation.

**Keywords:** learning engineering; agentic simulation; competency; interdisciplinary collaboration; design science; scenario-based learning; human–AI teaming.

## 1. Research motivation

A completed intervention obscures how a team recognized its problem, requested evidence, used professional expertise, negotiated competing objectives, and handled uncertainty. A team might possess every relevant capability yet fail to use it. Conversely, an individual without a particular job title may possess the necessary competencies. The experimental object is therefore not a contest among stereotyped 'data science,' 'human-centered,' and 'learning engineering' teams. It is the relation between expertise that is **available**, expertise that is **utilized**, and the process by which contributions are **integrated** into consequential decisions.

The learning engineering flower (Ali et al., 2025) supplies an intentionally non-exhaustive starting vocabulary for expertise. Its eight petals are Learning Sciences, Learning Experience Design, Data Science, Assessment/Measurement/Evaluation, Learning Environment Engineering, Software Engineering, Subject-Matter Expertise, and Education/Training Professionals. The framework describes possible contributions, not eight mandatory agents or eight validated proficiency scales. A scenario may require other competencies, and an individual may span multiple petals.

## 2. Constructs and research questions

**Person:** professional identity, task-specific knowledge, competency profile, incentives, and limits. **Project role:** assigned responsibility and authority independent of professional identity. **Team:** members, accessible consultative capacity, budget, and coordination mechanism. **Scenario:** visible evidence, constraints, stakeholder objectives, and separately held environmental truth. **Learning engineering practice:** inquiry, integration, design, implementation, testing, evidence-based revision, whether or not any member has the title learning engineer.

Competency *coverage* is the match between required and accessible capabilities. Competency *utilization* refers to evidence that a contribution informed inquiry or decisions rather than merely being uttered. Competency *integration* describes how contributions are combined, challenged, attributed, and reconciled against the goals of the system and people affected by it. The three constructs should be measured separately.

- **RQ1:** How does specialist availability affect the evidence sought and interventions proposed?
- **RQ2:** With the same expertise available, does a structured integration process change which contributions influence decisions?
- **RQ3:** Do these differences lead to identifiable changes under matched routine and disruptive deployments, rather than only different-sounding conversations?
- **RQ4:** When do a model's pretrained capabilities, unrestricted synthesis, or an overpowered evaluator erase or manufacture apparent competency effects?
- **RQ5:** Can a learner use the simulation to diagnose expertise needs, anticipate tradeoffs, and transfer that reasoning to a novel organizational problem?

No particular condition is assumed to win; additional expertise may impose costs or be unnecessary in a given context.

## 3. Scenario and staffing

The pilot concerns a fictional three-site logistics organization using an AI dispatch assistant. Routine decisions become faster while exception and shift-change failures increase. The organization's desired outcomes include reliable judgment, throughput, worker agency, feasible implementation, and service continuity during assistant outages. The public brief supplies initial error trends and stakeholder reports, not a solution or privileged diagnosis. Hidden event logic is separated from design-agent inputs.

The embedded team comprises an operations manager (domain and workflow expertise), a data scientist (measurement and analysis), and a workplace training designer (experience design and delivery expertise, with nonzero learning-science familiarity). A learning scientist is optional and consultable, not omnipresent. No participant is declared incapable outside their profession. The prototype's profiles and capabilities are simulation settings, not empirical measures of any profession.

Three initial conditions are: **A**, the embedded team without specialist consultation; **B**, the same team with a consultable learning scientist, who may or may not be called; **C**, the same available people as B, coupled with a structured integration protocol asking participants to connect evidence, transfer, operating constraints, costs, and unresolved assumptions. C cannot add hidden expertise, implement new requirements on behalf of specialists, or receive hidden state.

Consultation and coordination change the mechanism, while role titles remain unchanged. The present minimal demonstration is a *proof of experimental wiring*, not yet an identified causal estimate: integration also changes prompt opportunities, and specialist participation is endogenous. A factorial randomized follow-up must address these confounds.

## 4. Two-phase instrument

### Design / Develop

The team conducts a realistic project conversation. Agents may ask for evidence, disagree, identify uncertainty, seek consultation, and propose design alternatives. Professional identity, competence, task authority, and available resources are explicit. Specialist knowledge packets and evidentiary access remain bounded by the configuration. A coordinating agent may route requests but must not author missing technical claims. A learner-facing plain-language overlay is authored *outside* the design-agent context to translate assumptions and decision implications without coaching the team.

The outcome is a **frozen intervention specification** with actions, ownership, cost, assumptions, evidence plan, and an unchangeable artifact identity. A design is not repaired after the deployment events are known. If a later revision occurs, it becomes a new experimental unit.

### Deploy / Test

The same intervention is examined under **easy** (routine operations), **medium** (shift disruption and exception surge), and **hard** (assistant outage requiring independent judgment) conditions. Easy, medium, and hard must have documented, scenario-relevant mechanisms and common event seeds across conditions. A stateful test environment distinguishes capability, human concerns, and organizational outcomes without assuming that a single scalar defines success. Tests on one frozen intervention are repeated measures, not independent teams.

The mechanistic pilot models capability, worker agency, throughput, and recovery as separate synthetic axes. These are explicitly *authored response functions*. They are neither calibrated workplace measures nor a predictive model of logistics operations.

### Independent assessment

Process evaluation reviews problem framing, evidence sought, turn-by-turn attribution, objections, uncertainty, and competency boundary compliance. Intervention evaluation inspects feasibility and coherence. Deployment assessment uses actual recorded event states. Agentic expert evaluation may aid explanation, but its judgments must remain independent of authorship, reference exact evidence, and undergo human calibration. The evaluator may not repair a design. Missing observations are labeled unknown, not failures or successes.

## 5. Minimal viable execution and provenance

A reproducible **mechanistic policy-agent fixture** has been added at `tools/lifecycle/competency_pilot.mjs`. It generates conversational proposals from predefined actor-authorized action pools, can invoke a consultable specialist, freezes selected interventions under a common seven-unit budget, and applies matched deployment stress rules. The initial fixture uses three seeds × three configurations = **9** design records, each with three stress tests = **27** deployment records.

The fixture is intentionally *not* presented as actual large-language-model teamwork: utterances and effects come from authored policy and response tables. Thus, it can demonstrate the fidelity of data contracts, versioning, matched comparisons, replay, and control boundaries, but cannot establish a disciplinary effect. Reproducibility tests explicitly check source-permitted proposals, no expert utterances without consultation, budget constraints, matched event seeds, frozen artifacts, and numeric outcomes. Source code and complete records are available from the repository's dedicated GitHub Actions workflow; CI outcomes should be checked before claiming they passed.

**Evidence status:** Deterministic surrogate execution completed in the orchestration harness. Formal Node regression verification and evidence archiving are delegated to the repository workflow; their success must be independently checked. Existing historical dynamic-flower runs remain distinct from this pilot and are not counted as treatment observations.

## 6. Teaching use

A learner receives the initial scenario and predicts the relevant competencies before seeing the conversation. During replay, optional plain-language annotations expose points where a team confuses observed performance with learning, chooses a proxy, ignores a stakeholder, or fails to resolve a specialist objection. The learner predicts medium/hard consequences before unveiling stress tests, then proposes a counterfactual staffing or coordination change. The teaching instrument should expose both improved and worsened outcomes and invite learners to explain tradeoffs.

A human study should compare this interactive intervention with a strong static-case alternative, ideally using pretest, immediate transfer, and delayed novel-case reasoning measures. Satisfaction ratings alone cannot demonstrate learning.

## 7. Validity, threats, and planned experiments

**Construct validity:** A professional label does not imply proficiency. Validate task-specific calibration probes for competency depth and overlap. Check whether gaps remain observable under shared pretrained model knowledge. **Causal identification:** Randomize consultation access and integration separately while keeping base staff, budget, turn opportunity, information access, scenario, and evaluator conditions fixed. **World validity:** Run sensitivity analyses with different event severity, hidden causes, staffing capacity, implementation cost, and alternative valid interventions. **Statistical inference:** Treat each frozen conversation as the independent design unit, use multiple seeds, models and organizational cases, and retain null and unfavorable runs. **Evaluation validity:** Blind raters to condition where feasible, report agreement, and ensure model reviews cannot silently become ground truth. **Educational validity:** Include human learner transfer and retention evidence.

## 8. Discussion

The research contribution is an instrument for examining mechanisms, not a demonstration that learning engineers outperform other professionals. In some contexts, the best intervention may involve process engineering rather than teaching. A strong integrator may improve the use of available expertise, while in others the specialist contribution may be small, expensive, or poorly matched to the problem. This uncertainty is essential, not a defect.

The mechanistic fixture is useful as an engineering and pedagogy demonstrator, but it encodes behavior in authored action priorities and event rules. Any resulting differences are **effects of those authoring choices within the toy world**. Live-agent dialogue, calibrated world simulation, independent human evaluation, and learner studies are required for stronger claims.

## 9. Conclusion

Learning engineering can be modeled as a situated practice of obtaining, using, and integrating expertise under organizational constraints. A simulation that freezes decisions before exposing realistic stress conditions, protects competency boundaries, and retains complete conversational provenance can make those processes inspectable. The initial deterministic fixture establishes a reproducible architecture for asking the questions; the next study must establish whether the observed phenomena survive independently generated agent conversations and credible scenario validation.

## References

Ali, Z., Morehead, K., Jay, M., Arner, T., Lis, J., & Braitling, B. (2025). *Learning engineering is a team sport: Collaborative explorations for team building strategies with short scenarios in various contexts.* https://doi.org/10.59668/2109.21837

Epstein, J. M. (2008). Why model? *Journal of Artificial Societies and Social Simulation, 11*(4), 12. https://jasss.surrey.ac.uk/11/4/12.html

Sandoval, W. A. (2014). Conjecture mapping: An approach to systematic educational design research. *Journal of the Learning Sciences, 23*(1), 18–36. https://doi.org/10.1080/10508406.2013.778204

Zheng, L., et al. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *NeurIPS 36*. https://arxiv.org/abs/2306.05685

**Reproducible source and protocol:** https://github.com/wrgr/capabilitymatters/blob/main/tools/lifecycle/competency_pilot.mjs
