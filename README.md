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
  `case-studies` (index + `[slug]` detail pages)
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

Tests are plain-Python file-content assertions (there is no JS test runner here):

```sh
python3 tests/test_case_studies_sync.py
python3 tests/test_experiments_page.py
python3 tests/test_slick_sheet.py
```

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
