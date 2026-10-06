# Simulation role contract

Registry version 1.1.0. Source: `src/data/lifecycle/roles.json`. Resolver: `tools/lifecycle/role_profiles.py`. The public role explorer and the local runner consume the same resolved contract.

## Composition

`contributor` supplies shared evidence, dissent, correction, human/system capability and flourishing duties. `specialist` adds a bounded disciplinary draft. Concrete roles extend one of these profiles. `workforce-domain`, `school-science-domain` and `library-access-domain` extend `domain`, adding context duties while retaining evidence limits and practitioner review. Registry 1.1.0 adds the two diverse-case specializations; framework 1.0.0 remains unchanged.

Single-parent inheritance is explicit and cycle checked. Duties accumulate without duplicate entries. A child replaces the target for a specified competency and retains other parent targets. Unknown parents, fields, competency IDs and proficiency levels fail validation. The resolver returns independent copies; one profile cannot mutate its parent or another role. Permission, secret, tool-access and approval fields are not valid inherited properties. Runtime authority remains fixed in code.

| Role ID | Contribution | Focus |
|---|---|---|
| `orchestrator` | Learning engineer: integrate specialist drafts, preserve dissent and decide next action or return stage | Integrative orchestration across the LENS domains |
| `learning` | Learning scientist: practice, feedback, retention and transfer hypotheses | Iterative Development; Human-System Collaboration; Test & Evaluation |
| `systems` | Systems engineer: coupled requirements, dependencies, recovery and non-training levers | Systems Analysis; Iterative Development; Sociotechnical Constraints |
| `design` | Human-centered designer: affected people, access, burden and agency | Iterative Development; Human-System Collaboration; Sociotechnical Constraints |
| `measurement` | Measurement specialist: task evidence, comparisons, missingness and causal threats | Systems Analysis; Test & Evaluation |
| `responsible` | Responsible AI specialist: delegation, privacy, correction and human decisions | Human-System Collaboration; Test & Evaluation; Sociotechnical Constraints |
| `implementation` | Implementation specialist: executable candidate, technical boundaries and fallback | Iterative Development; Test & Evaluation |
| `domain` | Domain specialist: provided domain context and limits | Systems Analysis; Human-System Collaboration; Sociotechnical Constraints |
| `scenario` | Hypothetical objection or event that invalidates a named assumption | Systems Analysis; Test & Evaluation; Sociotechnical Constraints |

These associations are the project team's declared simulation design, not credential equivalences. The registry also retains awareness targets outside each role's focus. Concrete tasks and affected people's context decide which contribution is appropriate.

## Add a specialization

Add a concrete profile with `extends`, `category`, `name`, `competency`, additional `duties` and any `proficiency_targets` overrides. Increment the registry version when responsibilities change. Run profile and lifecycle checks, regenerate the public role contract, and review the resulting duties. Select a domain specialization with `--domain-profile workforce-domain`; unknown or non-domain profiles are rejected.

The run pins the resolved contract, not merely the profile's display name. Preserve its source, version, lineage and hashes. If the framework later changes, define an explicit reviewed crosswalk rather than assuming similar labels are equivalent. The scenario role never invents empirical results. The domain role never treats its assigned name as proof of expertise.

The public role explorer leads with a nine-role directory, then exposes each role’s remit, expected contribution, profile-specific duties, inherited responsibilities and requested LENS targets. Three domain specializations include their actual case bindings; the workforce specialization is available for new runs and is not retroactively assigned to the original workforce case. The Agentic LE landing page links directly to each role. Display explanations do not add instructions or performance evidence to the versioned runtime contract.
