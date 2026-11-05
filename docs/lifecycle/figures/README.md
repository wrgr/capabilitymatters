# Publication figures

These editable SVGs and high-resolution PNG previews explain the implemented
competency-mediation instrument and the strongest traceable dynamic example.
They do not represent a new agent execution or a measured human outcome.

- `competency-architecture.svg`: Figure 1, with separate deterministic and dynamic
  paths, different evidence classes, a freeze before event release, and evaluation.
- `controlroom-dialogue-table.svg`: Table 1, actual verbatim dialogue excerpts with
  analytic summaries of the decisions and limits they informed.
- `controlroom-stress-test.svg`: Figure 2, the exact frozen design applied to the
  three released conditions, retaining conditional behavior and unobserved results.
- `competency-figure-sources.json`: exact quote selections, source hashes, the full
  frozen-artifact hash, authored event text, and explicitly interpretive summaries.

Rebuild SVGs from the repository root with
`python3 tools/lifecycle/paper_figures.py`. No package or environment variable is
required. The renderer rejects changed source bytes, unsupported quotations, a
different frozen hash or a substituted event. It does not automatically certify
the semantic accuracy of analytic paraphrases.

PNG previews were rendered at twice the SVG dimensions using headless Chrome,
then visually inspected. Each SVG has selectable text, an accessible title and
description, and a white print background. The render checks report no text
outside the figure boundary. Source SVGs are the publication masters; use their
vector text when preparing the final proceedings layout.

The main manuscript covers only the deterministic demonstration and three focal
latest dynamic examples. The separate companion supplement retains development
and historical material outside that analysis. The full original research archive
and its first-commit file manifest remain unchanged.
