# Capability Matters

Source for [capabilitymatters.org](https://capabilitymatters.org) — *"Capability is a system parameter."*
The site for Johns Hopkins' LENS (Learning Engineering for Next-Generation Systems)
specialization, built with [Astro](https://astro.build).

This repository was extracted from [`wrgr/lecommons`](https://github.com/wrgr/lecommons) (site
history preserved). It's deliberately narrow: the LENS program itself, field notes written in
the LENS voice, and case material like the LLM101 exemplar — not an index of the field. The
shared IEEE ICICLE / Learning Engineering Commons corpus (reading list, practice library, tools
catalog, events calendar, community roster) lives at
[lecommons.org](https://lecommons.org) and is linked to, not duplicated, here.

## Layout

- `src/pages/` — routes: `index` (homepage), `about`, `field-notes`, `llm101`,
  `case-studies` (index + `[slug]` detail pages), and
  `about/what-you-will-do` — the web edition of the companion sheet, **live but
  unlisted**: `noindex`, no nav entry, no homepage link, meant to be handed out
  as a URL until the program announces it. To launch it, drop the robots meta,
  add the links, and delete `test_companion_page_is_unlisted`.
- `src/content/field-notes/` — MDX collection: short editorial posts in the LENS voice
- `src/content/case-studies/` — MDX collection: LENS case studies drawn from
  *Capability Matters: A Casebook* (one failure + one success per topical part). Each
  file's frontmatter carries the salient fields faithfully from the book (impact, "In
  brief" summary, five-beat spine, Learning-Engineering-Lens pair, the three anchors,
  and any COI / evidence-tier disclosure, competing readings, or scope limit); the
  MDX body is the site-voice lead. Rendered via the `LensBar` and `Disclosure`
  components in `src/components/`.

  Two rules keep the render honest, and `tests/test_case_studies_sync.py` pins them:
  a caveat the book carries — a disclosure, an evidence tier, a competing reading, a
  scope limit — must reach both the page and the `AskAI` prompt unsoftened; and when a
  casebook revision pass corrects a fact, the site-voice lead beside the frontmatter is
  corrected in the same pass. The objective tier is **LEO** (LENS Educational
  Objective), per `lens_program/2_*` v2.3; `CLO` now names the course tier below it.
- `public/` — static assets (favicons, the two LENS sheets linked from the
  homepage — `LENS_Overview_Aug2026.pdf` and `LENS_What_You_Will_Do_Aug2026.pdf`
  — and the `capability-matters-casebook-draft.pdf`, the casebook's 48-case
  reading edition, offered for download under the case examples; CC BY-ND 4.0)
- `slick-sheet/` — print sources for those PDFs: one self-contained HTML file
  each, plus the web fonts they share (see "Print sheets" below)

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # builds into dist/
```

Content tests use Python; interactive logic tests use Node's built-in tools:

```sh
python3 tests/test_case_studies_sync.py
python3 tests/test_experiments_page.py
python3 tests/test_slick_sheet.py
node --test tests/test_prototypes.mjs
```

## Problems to Prototypes

`/problems-to-prototypes/` holds 38 evidence-linked briefs across AILE, LXD,
LENS, and canonical LENS system problems. Nineteen currently have working local
prototypes: all 12 AILE briefs, all four LENS briefs, the EdTech Alignment Auditor,
Human–AI Delegation Simulator, and Evidence-to-Impact Mapper. The remaining 15 LXD
and four canonical LENS briefs are deferred and explicitly marked as not working.
`/prototypes/` redirects to the gallery filtered to runnable exercises. Keyword,
collection, and availability filters are reflected in the URL for sharing.

The exercises use local heuristics, require no AI endpoint, and clear on reload.
The debate coach compares revisions with the submitted attempt and its confidence;
the auditor checks for missing inputs and insufficient evidence before offering a
provisional interpretation; the capability map preserves each role's evidence
selections while switching roles. Evidence coverage is not a readiness score.
Each exercise links back to its brief and includes the source anchors that motivate
its design. Optional AI critique copies the public brief, not exercise entries.
The delegation simulator records choices, rationales, confidence, and source
inspection across three authored cases, then exports a JSON decision record.
The evidence mapper distinguishes activity, performance, and transfer measures,
states the limits of the selected comparison, and exports a plain-text plan.
Neither tool machine-scores written reasoning or estimates real-world effects.

The gallery and Experiments page also link to the existing Capability Pipeline
at `/capability-pipeline/index.html#simulation`. The fragment opens “Choose your
own adventure” directly; `#cases` opens the five-case systems-process explorer.

Run `npm run test:prototypes` and `npm run build` after changes.
The regression checks parse the actual inline scripts and exercise audit validation,
evidence warnings, debate comparisons, scenario rounds, measurement plans,
and the brief/evidence relationships.
For browser review, check combined gallery filters and URL reloads, all tool
interactions, downloads, adventure links, and narrow-screen layouts. Astro's static build does not validate
JavaScript inside `is:inline` scripts, so the script checks are essential.

`src/data/prototypes/status.json` is the explicit status registry for every brief.
`workingPrototype` is a boolean, with a route for each implemented tool. False
entries remain visible as design briefs. The gallery combines this field with
collection and keyword filters; URLs such as
`/problems-to-prototypes/?collection=AILE&workingPrototype=true` preserve a view.
The older `availability=runnable` query remains recognized.

Before setting a tool's status to true, complete its interaction, apply the
seven-point critique from `AiCritiqueLaunch.astro`, make the resulting edits, and
run core and browser checks. Record concrete findings in `reviews-*.json`, keyed
by brief ID, with assumption, failureMode, falsificationTest, nonAiAlternative,
measurement, risks, edits, and tests. The shared shell displays this review.
“Working” describes the tested local interaction; it is not evidence that an
entire design brief is implemented or that a learning benefit is validated.

The browser suite (`npm run test:prototypes:browser`) serves the built `dist/`
locally and uses an externally available Playwright installation. Set
`PLAYWRIGHT_MODULE` to its absolute entry-module path if it is not resolvable as
`playwright`, and optionally `CHROME_BINARY` to an installed Chromium/Chrome.
No browser automation package is added to the site's production dependencies.
Optional `PROTOTYPE_SCREENSHOTS` points to an existing screenshot directory.

The AILE additions include a district-use sandbox, voluntary family literacy
activities, source-grounded offline packet exports, a teacher-overridable mastery
pathway, teacher decision practice, a 2D workflow/fault simulation, fictional
clinical-record source checking, source-linked academic navigation practice,
bilingual draft comparison, a learner-controlled curiosity journal, and classroom
language rehearsal. Their pages name the implemented scope: none runs a language
model, supplies live institutional policy, certifies translation or clinical
competence, or implements XR.

The LENS additions map judgment evidence across program stages, separate frontline
training hypotheses from system constraints, and compare source-linked training
rules with local variants and conflict holds. Human review remains explicit.
The shared browser suite exercises each completed interaction, negative paths,
stale-result handling, reset, and exported records; the core suites check the
rules and evidence boundaries. Existing MicroGPT source and assets are unchanged.

Next useful increments are an explicit performance standard for each workforce
task, revision export for the debate coach, and new delegation cases that test
transfer beyond the three practiced scenarios. The current rules remain teaching aids;
their outputs need human review before any claim about learning or readiness.

## Print sheets

Both PDFs the homepage links are generated, not hand-placed:

| Source (`slick-sheet/`) | Output (`public/`) | Pages |
|---|---|---|
| `lens-slick-sheet.html` | `LENS_Overview_Aug2026.pdf` | 1 |
| `lens-what-you-will-do.html` | `LENS_What_You_Will_Do_Aug2026.pdf` | 2 |

Edit the copy in the HTML source and re-render:

```sh
./scripts/build-slick-sheet.sh                      # both sheets
./scripts/build-slick-sheet.sh lens-slick-sheet     # just one
CHROME=/path/to/chrome ./scripts/build-slick-sheet.sh
```

The script needs a Chromium or Chrome binary (it probes `PLAYWRIGHT_BROWSERS_PATH`,
`chromium`, `chromium-browser`, and `google-chrome`); no npm dependency is added.
Each sheet is laid out to fill its pages exactly, so check the rendered page count
after any copy change — added lines push content off a page rather than onto a new
one. Competency names, program facts, course descriptions and assignments, and the
entering/leaving pairs come from `lens_program/` in the sibling
`wrgr/lens-concentration` repo (docs 1, 2, 5, 7 and the LEN 01 syllabus); keep them
in sync with the versions of record there. The fonts under `slick-sheet/fonts/` are
the latin subsets of Instrument Serif and DM Sans (SIL Open Font License), vendored
so the render works offline.

## Deploy

Pushes to `main` trigger `.github/workflows/deploy-gh-pages.yml`, which builds the site and
publishes `dist/` to the `gh-pages` branch with `CNAME capabilitymatters.org`.

## MicroGPT teaching labs

`/microgpt/` follows three examples: **letters**, **words in original example
haikus**, and **bias** (name representation plus synthetic engagement labels).
`TokenLab.astro` hosts two independent introductory workers. `TrainingLab.astro`
hosts the existing name-bias transformer and `BiasLab.astro` fits the engagement
classifiers. `DataExplorer.astro` preserves the detailed name-data audit.
`ExplainTray.astro` provides modal help, straightforward-language popups and a
viewer of the actual source. All data is inspectable and downloadable. The
existing article remains the AI leadership companion.

The haiku corpus consists of 64 combinations of 12 original lines in a controlled
English 5/7/5 form. It is not third-party poetry or a representative literary corpus.
48 poems train the model; 16 combinations are held out, with every source line
already present in training. This narrow recombination test does not establish
general poetic ability. Readers can compare character, word and whole-line tokens on the same poem,
then train any mode. The default word mode predicts whole words and line breaks.
The character mode has 24 IDs, 93 positions and 3,420 parameters; line mode has
13 IDs, 4 positions and 2,088 parameters. The whole-line model can only reorder
its 12 source lines. None enforces a complete 5/7/5 output form. The default
61-token, 20-position model has 3,432 parameters;
letter/name models retain their 27 tokens, 12 positions and 2,520 parameters.
Their token losses are not directly comparable.

The dependency-free modules in `public/microgpt/` are served directly:

- `engine.js`: indexed reverse-mode differentiation, causal transformer, Adam,
  deterministic dataset selection, evaluation, sampling and complete snapshots.
- `haiku-tokens.js`: character/word/line vocabularies, exact split/reassembly semantics and capacities.
- `haiku-data.js`: original source lines, exact split, training-only word vocabulary and tokenization.
- `token-data-ui.js`: complete introductory datasets, token IDs, vocabulary and multiline CSV export.
- `token-lab.js`: independent worker controls, learning traces and checkpoint import/export.
- `haiku-checkpoints.json`, `haiku-char-checkpoints.json`, `haiku-line-checkpoints.json`:
  genuine 0-, 100- and 600-step states for all three tokenizations.
- `datasets.js`: published name lists, provenance, fixed split and exposure scenarios.
- `data-ui.js`: searchable exact data, complete CSV export and measured comparison table.
- `simple.js`: concrete, shorter explanations for every teaching topic.
- `worker.js`: responsive background training and session checkpoint management.
- `lab.js`: training controls, import/export, measured charts and saved presets.
- `bias.js`: declared data/label assumptions, logistic fitting and independent audit.
- `bias-data-ui.js`: all training/test observations, condition-specific labels and full-precision CSVs.
- `bias-ui.js`: four-condition comparison and matched-input diagnostic.
- `explanations.js` and `explain.js`: plain-language stage explanations, help
  definitions and line-numbered excerpts from the actual served modules.
- `lab.css`: responsive lab and modal presentation.
- `NOTICE.md`: Karpathy attribution and exact implementation differences.
- `checkpoints.json`: measured fictional 0-, 100- and 600-step states plus three
  600-step name models (50:50, 90:10, 10:90), including dataset, optimizer
  and random state, generated with the same engine the browser uses.

No external model service, sensor access, analytics or training-data upload is
used by these modules. No additional runtime package or environment setting is
required. A browser with module workers is needed for live transformer training.
Imports are parsed as data, bounded to 1 MB, and validated against the architecture.
Saved states in the session are transient; readers can download and import them.

Rebuild bundled checkpoints after changing training math, data or architecture:

```sh
node scripts/build-microgpt-checkpoints.mjs
node tests/test_microgpt_engine.mjs
node tests/test_microgpt_haiku.mjs
npm run build
python3 tests/test_microgpt_page.py
python3 tests/test_experiments_page.py
```

The engine test checks gradients against finite differences, data separation,
loss improvement, exact continuation from a checkpoint, unchanged parameters
through evaluation/sampling, deterministic presets, and the intended synthetic
bias effects. It also checks exact name splits, shared initial weights, cross-dataset
restore, legacy compatibility, atomic rejection of mismatched data, and a shorter
explanation for every topic. The page test checks attribution, simulation boundaries,
data inspection controls, contextual popups and links.
The separate `capability-microgpt-tokens-v1` format binds the selected haiku
vocabulary, tokenization ID and architecture (the earlier word-only format
remains recognized). Restore validates a fresh candidate before replacing
the current model, so a rejected import cannot alter its state. Imports are scoped
to the relevant example. The haiku test verifies full-token gradients, learning in all three modes,
identical disjoint poem pools, exact resume and cross-architecture validation.
The v2 character schema records a dataset ID and exact serialized split, checked before restore.
Legacy v1 states resolve to the original fictional data. The name split uses every
third entry, after alphabetical ordering within each study sex category, as held out.
The schema version must change if snapshot compatibility changes. Preserve the
separation between empirical citations, invented assumptions, computed outputs,
and educational hypotheses when revising the page.
