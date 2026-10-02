# Capability Matters project lifecycle

Version 1.1.0 · October 1, 2026

A seed becomes a runnable candidate product and an inspectable project record. The learning engineer orchestrates competency and domain specialists through Understand, Map, Design, Build, Instrument, Deploy, Evaluate and Refine. The cycle comes from this repository's Problems to Prototypes framework. It can return to earlier stages, select a non-AI intervention, change the work system or stop.

## Product and project record

Build supplies self-contained interactive HTML. A complete local run packages the candidate, requirements, latest artifacts, full journal and a handoff manifest. A candidate is ready to inspect and exercise; operational release requires the separate human and evidence gates in [PRODUCT.md](PRODUCT.md).

The public journal records inputs, prompts, returned contributions, pros/cons/tradeoffs, risks, human and system requirements, flourishing considerations, dissent, decisions and immutable artifact revisions. Scenario events are hypothetical. Technical findings are observations of the implementation, not fictional participant results. Preserve failures and rejected output. Do not request or claim private chain of thought.

Understand creates the problem and context brief; Map connects human and system requirements, dependencies, operating conditions and testable assumptions; Design compares approaches; Build creates a small executable candidate; Instrument defines evidence and opportunity-to-act conditions; Deploy rehearses accountable gates; Evaluate distinguishes observed behavior from unknown learning or field outcomes; Refine selects the next change and its justification. Running through a stage never supplies real human approval.

## Standard roles

The versioned registry in `src/data/lifecycle/` is shared by the website and local runner. Profiles inherit contribution duties, then specialize requested proficiency by LENS domain. The learning engineer integrates; specialists provide bounded drafts; the scenario role challenges a named assumption and requests a concrete requirement change. Relevant domain profiles bind to supplied context and require practitioner validation. See [ROLES.md](ROLES.md) and [PROFICIENCY.md](PROFICIENCY.md).

Each future run records the exact resolved role contract, registry/framework versions and hashes in its first hashed event. Editing a registry changes future runs only. Legacy journals retain their original roster and prompts without retrospective proficiency assignment. Role inheritance cannot grant approval authority or substitute for observed task performance.

## Evidence, replay and hosting

The append-only journal uses sequence numbers, previous-event hashes, artifact content hashes, revision parents and actual prior evidence references. Hashes detect changes; they are not identity signatures. Provider responses are cached with provenance; raw receipts remain local. No silent live-to-scripted fallback exists.

Replay shows only the artifacts available at the selected event, with revision comparison and evidence navigation. The generated candidate executes in a sandboxed frame with external-resource and API restrictions. Source review and interaction testing remain required. Standalone product bundles use a restrictive content security policy and fictional inputs.

Capability Matters' existing GitHub Pages deployment hosts the guide, roles, products and saved replay under `/agentic-le/`. This route is intentionally unlisted: no directory, project-seed or workforce-prototype links advertise it, and its pages request search-engine exclusion. Generation remains a local authenticated Codex command-line process. The static website contains no model credential, live job service or participant records. A future hosted runner needs explicitly scoped authentication, durable jobs, secret handling, usage controls and human decisions; these are not current capabilities.

## Acceptance

Verify executable delivery, product/journal source matching, role resolution, failed-turn preservation, evidence references, immutable history and replay visibility. Exercise the actual candidate in a browser. Keep technical checks, human review, learning, transfer and flourishing as separate claims. Missing evidence remains unknown. See [VERIFICATION.md](VERIFICATION.md).

## Diverse case collection

The original workforce record is preserved alongside two additional actual live-agent executions on fictional school-science and public-library briefs. `src/data/lifecycle/cases.json` binds each saved journal, domain profile and candidate route. Normal packaging verifies journals and profile bindings, regenerates products and emits a public inventory with counts and hashes. The replay selects a case with `?case=ID`, optionally selects an event with `&event=N`, and opens the product belonging to that case. The fixed workforce practice exercise is hidden for other domains.

Source-specific host checks are recorded after the model-stage completion; they do not imply a real pilot, learning outcomes, independent expert validation or demonstrated proficiency. [CASES.md](CASES.md) tracks expansion and the human review still required.

Stage-name compatibility: Map is the public name for stage two, meaning map capabilities and conditions. The internal key `model` remains stable for saved runs, revision references and response schemas. Historical agent messages and artifacts are quoted unchanged; current navigation, future prompts and requirement headings use Map. Learner teaching commentary is separate from the immutable evidence record.
