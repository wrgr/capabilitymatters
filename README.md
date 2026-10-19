# Capability Matters

Source for [capabilitymatters.org](https://capabilitymatters.org) — *"Capability is a system parameter."*
Public cases, experiments, and design work for independent practitioners and teams,
also supporting Johns Hopkins' LENS (Learning Engineering for Next-Generation Systems)
concentration, built with [Astro](https://astro.build).

This repository was extracted from [`wrgr/lecommons`](https://github.com/wrgr/lecommons) (site
history preserved). Its focus is the LENS program, documented case studies, interactive
experiments, and prototype design work. The
shared IEEE ICICLE / Learning Engineering Commons corpus (reading list, practice library, tools
catalog, events calendar, community roster) lives at
[lecommons.org](https://lecommons.org) and is linked to, not duplicated, here.

## Content organization

The primary menu is Motivation (the homepage), Approach, Start Here, Case Studies,
Experiments, and Prototypes. Approach opens the worked-case Capability Pipeline;
its standalone host provides the same destinations back to the main site.
The School of Education talk and Field Notes are no longer menu entries; their
content has not been deleted. Learning Engineering Commons remains in the footer
and Start Here. Existing route URLs and prototype filter URLs are preserved.

- **Case Studies:** documented examples with evidence, caveats, and the draft casebook.
- **Experiments:** learning labs, research/practice projects, and creative demonstrations.
- **Prototypes:** capability gaps, design briefs, working exercises, and evaluation plans.
- **Supporting reading:** Show Your Work is linked separately from runnable experiments.
- **Start Here:** audience pathways, a content guide, program context, and the author’s personal site.
  `/about/` remains a content alias with a canonical link to `/start-here/`;
  `/about/what-you-will-do/` remains intact and unlisted. `/welcome/` and
  `/motivation/` redirect to `/`, retaining query and fragment when JavaScript is enabled.
- **Agentic AI Lab:** the Experiments directory links directly to `/agentic-le/`,
  the existing case, product, and replay experience.

Menu descriptions live in `src/components/NavBar.astro`: hover/focus tooltips on
desktop and inline descriptions inside the mobile menu. The original homepage
presentation is preserved in `src/styles/home.css`, with direct paths into Start Here and the existing Agentic AI Lab. The collection introductions retain their cross-links.

Validation: `npm run build`, `python3 tests/test_navbar_workshop_link.py`, and
`python3 tests/test_experiments_page.py`. The legacy navbar test filename is retained;
it now checks both generated menus, menu descriptions, and the uncluttered homepage.

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

## About this resource

Resource pages use a shared native `<details>` disclosure, collapsed by default,
between the introduction and activity. It provides resource-specific descriptions,
use steps, and conceptual connections to LENS and learning engineering. The summary
supports Enter/Space, links stay out of the tab order while closed, and the shared
stylesheet supplies visible focus, mobile text wrapping and forced-color support.

- `src/components/ResourceAbout.astro` is the Astro entry point. Pass `resource` to
  select a guide from `src/data/resource-about.json`, or supply explicit `content`
  for collection-derived material. Use `headingLevel={3}` beneath a level-two title.
- `src/lib/resource-about.mjs` escapes all prose and renders the same markup for
  Astro, React and standalone hosts. Missing content and unsafe links fail builds.
- `public/resource-about.css` uses host palette tokens, including the case explorer's
  dark theme. React hosts retain a stable element so activity updates preserve the
  native disclosure state.
- `scripts/build-resource-about.mjs` packages twelve standalone host pages after
  lifecycle generation. Each insertion boundary is explicit and checked; repeated
  generation replaces the marked block. It runs before both Astro build and dev.
  Rebuild after changing any standalone generation source or guide content.
- `ResourceReading.astro` inserts guidance after each paper's opening text without
  changing its canonical manuscript, PDF, section IDs or table of contents.

Coverage includes all nineteen working prototypes, both model explainers (including
full-screen LLM101), Andon and its brief, all three Capability Pipeline entry points,
Rainbow Bug, Agentic LE guide/roles/records/replay, six candidate host pages, fourteen
case-study details, both papers, three Field Notes, and the resource directories.
The non-runnable briefs remain explained in their gallery. Externally hosted
projects are outside this repository. Saved `candidate.html`, archived replay HTML,
JSON journals, manifests, downloadable bundles and PDFs remain original evidence
artifacts; their surrounding host pages carry the guide.

**Required for every new resource page:** author a complete guide and render it
immediately after the introduction and before the activity. This applies to Astro,
React and standalone HTML at any route, including newly introduced directories.
Use at least two practical steps and explain the actual conceptual connection to
LENS and learning engineering. Contributor instructions live in
`AGENTS.md`, `.cursor/rules/resource-guidance.mdc` and `CLAUDE.md`.

The Astro build hook runs `scripts/check-resource-guidance.py` over every generated
HTML page. Missing cards, missing sections, unfinished explanations and default-open
cards fail the build and stop deployment. This uses real HTML parsing: a comment,
script string, inert template or hidden guide cannot satisfy the check. Every page
is required by default. `src/data/resource-page-policy.json` contains only exact,
reviewed exceptions for orientation/redirect pages and immutable evidence artifacts.
The two existing React hosts are checked after rendering by the browser suite.

The browser suite consumes the same automatically discovered output inventory.
New resources need no manual test-list registration. New client-rendered resources
need an explicit policy entry and still remain mandatory browser-test targets;
adding an exception is a reviewed content decision, not an authoring shortcut.
When changing shared guidance or markup, rebuild the committed Andon bundle with
`npm run build --prefix public/andon/source` after installing its existing pinned
build dependencies. No new production dependency is required.

Validation after `npm run build`:

```sh
npm run test:resource-guidance
npm run test:resource-about
npm run test:resource-about:browser
```

The browser suite checks collapsed state, Enter/Space, focus and link navigation,
expanded-card axe WCAG 2.1 A/AA rules, 320px reflow with 200% text and spacing,
the case explorer's dark palette, React state retention and representative
script-free hosts. It also verifies the desktop/mobile Approach link and the path
back to the main site. Set `CHROME_BINARY` for an installed Chrome executable and
`RESOURCE_ABOUT_OUTPUT` for its evidence directory. These checks supplement the
existing activity suites; they do not replace screen-reader or user evaluation.

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
own adventure” directly; `#cases` opens the five-case systems-process explorer. Its bottom
Integrative Practice card connects learner development, system evolution and
collective capability through continuous joint practice. The diagram and its
step-pair explanations live in `public/capability-pipeline/cases.html`, with
responsive rendering in `coupled-loops.js` and palette-matched styles in
`coupled-loops.css`. Solid arrows show contributions/evidence; dashed arrows
show revision. This conceptual view adds no numbered step or simulation rule.
Check it with `npm run test:pipeline`, `npm run build`, and browser review at
phone/desktop widths in light and dark themes.

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

## LENS community papers and Rainbow Bug

`/show-your-work/` presents *Show Your Work. LENS: Coupling Learner and System
Performance for Capability and Human Flourishing*. Canonical text:
`src/papers/show-your-work.md`; matching PDF: `public/papers/show-your-work.pdf`.

`/agentic-le/paper/` presents *Learning Engineering in Action:
Agentic Simulation for Collaboration and Learning from Success and Failure*.
Canonical text: `src/papers/learning-engineering-teams.md`; matching PDF:
`public/agentic-le/paper/paper.pdf`. The editable manuscript and evidence audit
are also available from that reading page. The homepage’s **Explore Agentic LE** link opens the three-case guide; the working pages retain search-engine exclusion metadata.

Both PDFs use `scripts/paper_pdf.py`, with linked references, wrapped tables,
page numbering and the canonical source hash in their metadata. The agentic
paper includes the existing vector process figure. To edit, revise the canonical
Markdown and rebuild both PDFs with Python, ReportLab, and svglib:

```sh
python3 -m pip install reportlab svglib
python3 scripts/build-show-your-work-pdf.py
python3 scripts/build-agentic-le-pdf.py
npm run build
python3 tests/test_show_your_work.py
python3 tests/test_experiments_page.py
```

Commit each generated PDF with its manuscript. The reading pages version PDF
links by content hash. Preserve the community-discussion and coauthor-review
labels, and distinguish simulated execution, authored teaching commentary,
exercised technical behavior, and evidence of actual learning or flourishing.
The Agentic LE prebuild packages its canonical manuscript and source-grounded
audit of all three cases without modifying their journals.

The separate Rainbow Bug card links to `/rainbow-bug/`, a static copy of the
supplied game (`index.html`, `game.js`, `style.css`, and its four character PNGs
plus asset README). The game logic and artwork are unchanged. The supplied
faculty job aid is available unchanged at `/vibe-coding-job-aid.docx`.
`src/pages/experiments.astro` credits Julian, age 6, with AI as a creative
partner and points the personal-site card to `https://will.grayroncal.com`.
The former coming-soon flag and rendering branch have been removed.

## Project Lifecycle Lab

`/agentic-le/` connects a seed idea to a runnable candidate product, the saved discussion, scenario challenges and versioned artifacts. `/agentic-le/roles/` documents versioned simulation role inheritance and requested proficiency; demonstrated proficiency remains unverified without reviewed task evidence. `/agentic-le/replay/` preserves the real-model fictional exemplar and separately labeled scripted rehearsal. `/agentic-le/product/` provides the executable product and portable handoff.

Canonical source: `tools/lifecycle/`, `src/data/lifecycle/`, `src/pages/agentic-le/` and `public/agentic-le/`. Read [the specification](docs/lifecycle/SPEC.md), [roles](docs/lifecycle/ROLES.md), [proficiency](docs/lifecycle/PROFICIENCY.md), [product release](docs/lifecycle/PRODUCT.md) and [operating instructions](docs/lifecycle/RUNNING.md). Generation runs locally with `CAPABILITY_MATTERS_LIVE=1`; the existing static hosting serves saved products and replay without model credentials.

Run `npm run test:lifecycle`, `npm run test:prototypes` and `npm run build`. The build packages the shared role contract and exemplar handoff before Astro. A future hosted runner and shared job queue remain separate work.

## Accessibility audit and regression checks

The October 2026 remediation record, scope boundaries and remaining manual validation are in [docs/accessibility/README.md](docs/accessibility/README.md). This project does not currently claim WCAG conformity. Optional preferences complement the default semantic, keyboard, contrast and responsive behavior.

Install development dependencies with `npm ci`; install a test browser with `npx playwright install chromium`. After `npm run build`, use `npm run test:a11y` for workflow assertions and `npm run test:a11y:audit` for route-wide evidence. Set `A11Y_OUTPUT` for reports/screenshots or `CHROME_BINARY` for an installed Chrome. The audit collector itself does not fail solely because a rule violation was found. LLM101 is maintained in `experiments/llm101/` and builds into the same site. `npm run test:llm101` serves the production build and verifies the local iframe, shared preferences and all 15 lessons; it also runs as part of `npm run test:a11y`. No accessibility command deploys the website.

## LLM101 explorer

The `/llm101/` contextual page embeds `/llm101/explorer/index.html` on the same origin. Maintained React source and authoring notes are in [experiments/llm101](experiments/llm101/README.md). The root dependency lockfile includes React 18, ReactDOM and KaTeX for the preserved explorer, with Vite and its React plugin as development build tools. Both development startup and production builds generate the app before Astro runs; rebuild it with `npm run build:llm101` after source edits during development. No separately deployed LLM101 app is required. The shared site preference code serves the app directly and synchronizes with the parent frame. Mathematical expressions include the KaTeX stylesheet/fonts and keyboard-scrollable display regions while preserving MathML.

Remaining manual checks and external application work are tracked in [issue #24](https://github.com/wrgr/capabilitymatters/issues/24) and [the remaining-work record](docs/accessibility/remaining-work.md).
