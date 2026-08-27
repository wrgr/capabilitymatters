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
- `public/` — static assets (favicons, `LENS_Overview_Aug2026.pdf` — the one-page
  LENS slick sheet linked from the homepage — and the
  `capability-matters-casebook-draft.pdf`, the casebook's 48-case reading
  edition, offered for download under the case examples; CC BY-ND 4.0)
- `slick-sheet/` — print source for that overview PDF: one self-contained HTML
  file plus the two web fonts it embeds (see "Slick sheet" below)

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

## Slick sheet

`public/LENS_Overview_Aug2026.pdf` — the one-page LENS overview the homepage
links — is generated, not hand-placed. Edit the copy in
`slick-sheet/lens-slick-sheet.html` and re-render:

```sh
./scripts/build-slick-sheet.sh          # or CHROME=/path/to/chrome ./scripts/...
```

The script needs a Chromium or Chrome binary (it probes `PLAYWRIGHT_BROWSERS_PATH`,
`chromium`, `chromium-browser`, and `google-chrome`); no npm dependency is added.
The sheet is laid out to fill exactly one US-Letter page, so check the rendered
page count after any copy change — added lines push content off the page rather
than onto a second one. Competency names, taglines, and program facts come from
`lens_program/1_LENS_Five_Competencies.md` and
`lens_program/2_LENS_Objectives_Course_Mapping.md` in the sibling
`wrgr/lens-concentration` repo; keep them in sync with the version of record there.
The two fonts under `slick-sheet/fonts/` are the latin subsets of Instrument Serif
and DM Sans (SIL Open Font License), vendored so the render works offline.

## Deploy

Pushes to `main` trigger `.github/workflows/deploy-gh-pages.yml`, which builds the site and
publishes `dist/` to the `gh-pages` branch with `CNAME capabilitymatters.org`.
