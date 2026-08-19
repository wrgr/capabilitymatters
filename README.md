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
- `public/` — static assets (favicons, LENS overview PDF, and the
  `capability-matters-casebook-draft.pdf` — the casebook's 48-case reading
  edition, offered for download under the case examples; CC BY-ND 4.0)

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
```

## Deploy

Pushes to `main` trigger `.github/workflows/deploy-gh-pages.yml`, which builds the site and
publishes `dist/` to the `gh-pages` branch with `CNAME capabilitymatters.org`.
