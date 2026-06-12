# Capability Matters

Source for [capabilitymatters.org](https://capabilitymatters.org) — *"Capability is a system parameter."*
An editorial lens site on learning engineering for next-generation systems, built with [Astro](https://astro.build).

This repository was extracted from [`wrgr/lecommons`](https://github.com/wrgr/lecommons) (site history
preserved) so the site is owned and hosted separately from the shared IEEE ICICLE / Learning
Engineering Commons research corpus that remains there.  

## Layout

- `src/pages/` — routes (home, about, topics, graph, reading list, community, events, tools, practice, search)
- `src/content/` — MDX collections: `community`, `events`, `field-notes`, `practice`, `reading-list`, `tools`
- `src/data/` — committed data snapshots the site builds from (see below)
- `public/` — static assets (favicons, LENS overview PDF, client-side search/filter scripts)
- `scripts/` — Python content tooling (snapshot sync, validation, importers, stub generation)
- `data/import_reports/` — JSON reports written by content import runs

## Develop

```sh
npm install
npm run dev             # local dev server
npm run build           # validates refs, then builds into dist/
npm run validate:refs   # strict provenance.ref validation (fails on orphans)
npm run test:scripts    # stub tests for the Python content tooling
```

`npm run build` first runs `scripts/validate_mdx_refs.py`, which needs only standard-library
Python 3 — no virtualenv or installs.

## Data snapshots from lecommons

The site builds standalone from committed snapshots under `src/data/`:

- `programs_people_registry.json` — people / orgs / programs / conferences / tools registry
- `landscape_paper_ids.json` — valid paper resource ids for provenance-ref validation
- `papers_seed.json`, `topic_map.json`, and friends — curated graph/topic data

The first two are generated from the `landscape/` corpus in `wrgr/lecommons`. To refresh them:

```sh
git clone https://github.com/wrgr/lecommons ../lecommons   # or set LECOMMONS_DIR
pip install -r scripts/requirements.txt                    # PyYAML
npm run sync:registry
git diff src/data/                                         # review, then commit
```

## Content tooling

All under `scripts/` (Python 3.11+):

- `import_lebok_refs.py` — import LEBOK-style citation lists into `src/content/reading-list/`
  (`--input file.txt [--write]`; dedupes against existing entries; reports land in `data/import_reports/`)
- `generate_mdx_stubs.py` — emit stub MDX for `featured: true` landscape YAML records (needs a lecommons checkout)
- `add_provenance_tags.py`, `derive_institutions_and_associations.py` — content maintenance passes
- `import_from_archive.py`, `import_from_excel.py` — one-shot historical seeders (need a lecommons checkout / source workbook)

## Deploy

Pushes to `main` trigger `.github/workflows/deploy-gh-pages.yml`, which builds the site and
publishes `dist/` to the `gh-pages` branch with `CNAME capabilitymatters.org`.

One-time cutover from lecommons (which previously served the domain):

1. In `wrgr/lecommons` → Settings → Pages: remove the custom domain and unpublish the Pages site.
2. In this repo → Settings → Pages: set the source to the `gh-pages` branch, add custom domain
   `capabilitymatters.org`, and re-enable **Enforce HTTPS** once the certificate provisions.
3. DNS needs no change — the domain already points at GitHub Pages for this account.

## Roadmap

- Link LEBOK (Learning Engineering Body of Knowledge) from this project as a wiki.
