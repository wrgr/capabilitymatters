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
  brief" summary, five-beat spine, Learning-Engineering-Lens pair, anchors, and any
  COI / evidence-tier disclosures); the MDX body is the site-voice lead. Rendered via
  the `LensBar` and `Disclosure` components in `src/components/`.
- `public/` — static assets (favicons, LENS overview PDF)

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # builds into dist/
```

## Deploy

Pushes to `main` trigger `.github/workflows/deploy-gh-pages.yml`, which builds the site and
publishes `dist/` to the `gh-pages` branch with `CNAME capabilitymatters.org`.
