# Andon Operations Lab

This standalone React experiment makes the management obligations behind Andon playable in a fictional distribution operation. It is listed under Learning labs at `/experiments/` and served at `/andon/`.

The core loop is signal → appropriate containment → observation and timely support → recovery → countermeasure trial → field verification → standard update or withdrawal. Separate measures audit on-time accepted service, defect escapes, responsiveness, unfinished work, and waiting burdens. The model has swappable behavioral personas, demand surges, limited responders, strained data sources, coaching, and queue assistance. Probabilities and behavioral effects are invented teaching assumptions, not calibrated operating data or a validated manager assessment.

## Files and purpose

- `index.html`: public page metadata and browser entrypoint.
- `app.js`: generated self-contained React runtime and simulation.
- `app.js.LEGAL.txt`: generated third-party license notices.
- `style.css`: responsive operating dashboard and accessible control styles.
- `research-brief.html`: historical primary-source research brief explaining Andon and its management principle.
- `source/page.tsx`: authored manager interface and local browser run history.
- `source/engine.ts`: deterministic keyed simulation with immutable commands and auditable measures.
- `source/main.tsx`: React mount point.
- `source/build.mjs`: repeatable standalone bundle build.
- `source/package.json`: pinned build/test dependencies, separate from the Astro site.
- `source/tests/engine.test.mjs`: simulation loop, replay, resources, consequences, and accounting checks.
- `source/tests/ui.test.mjs`: React rendering and actual control callback checks.
- `../../src/pages/experiments.astro`: existing directory updated with the Learning labs card.
- `../../tests/test_experiments_page.py`: directory regression updated for nine cards and the game's public assets.

## Rebuild and validate

The committed bundle is copied unchanged by Astro. No changes to the site's dependencies or hosting workflow are required. To edit and rebuild the game:

```sh
cd public/andon/source
npm install
npm test
npm run build
```

The source requires Node.js 22.18 or newer for TypeScript stripping in the tests. The browser entry is built for modern browsers. All visitor assets are served locally. Run summaries stay in the browser, with the last four saved when storage is available; storage failures are reported and do not stop play.

Fifteen automated tests passed, including 200 seeded shifts across personas and system conditions. Tests invoke the rendered action callbacks through observation, recovery, trial, and pilot. Browser visual and frame-time QA was unavailable during this release. Source review covers responsive layouts, native keyboard controls, labels, selected-state announcements, disabled states, visible focus, reduced motion, and confirmation before replacing an unfinished run.
