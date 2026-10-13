# LLM101 in Capability Matters

This directory maintains the interactive explorer previously hosted in `wrgr/llm101`, imported from commit `82d4c7db64593a94ead16cdcbaa32f1459fb4d2c`.

The contextual entry page remains `/llm101/`; the full explorer is `/llm101/explorer/`. Its React interface, lessons, citations, glossary, checks and reading tabs are preserved. Lessons and CSS were divided into smaller files without changing their data or cascade order. Historical authoring notes are retained in `AUTHORING.md`.

The root lockfile owns React, ReactDOM and KaTeX plus the existing Vite/React build toolchain. `npm run build:llm101` builds source into ignored `public/llm101/explorer/`; both `npm run dev` and `npm run build` run it first. During an Astro development session, rebuild the explorer after editing its source. Generated JavaScript, CSS and KaTeX fonts are shipped in the normal site build, with hashed asset URLs.

Preferences load directly from `/accessibility/preferences.js` and `/accessibility/shared.css`. Because the frame and parent share an origin, their stored preferences synchronize through browser storage events. No separate copy of that code is maintained here.

Run `npm run build`, `npm run test:llm101`, and `npm run test:a11y:audit`. The explorer suite checks the real same-origin embed and full-screen route, content preservation, all lessons/depths, named controls, modal focus, shared preferences/reset, mobile layouts and selected automated A/AA rules. It does not establish WCAG conformity; spoken assistive-technology and other manual coverage remain tracked in `docs/accessibility/remaining-work.md`.
