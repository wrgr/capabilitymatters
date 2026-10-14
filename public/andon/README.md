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
- `../../tests/test_experiments_page.py`: directory regression includes the game card and its public assets.

## Rebuild and validate

The committed bundle is copied unchanged by Astro. No changes to the site's dependencies or hosting workflow are required. To edit and rebuild the game:

```sh
cd public/andon/source
npm install
npm test
npm run build
```

The source requires Node.js 22.18 or newer for TypeScript stripping in the tests. The browser entry is built for modern browsers. All visitor assets are served locally. Run summaries stay in the browser, with the last four saved when storage is available; storage failures are reported and do not stop play.

Twenty-nine automated tests passed, including 200 seeded shifts across personas and system conditions. Tests invoke the rendered action callbacks through observation, recovery, trial, and pilot. Browser visual and frame-time QA was unavailable during this release. Source review covers responsive layouts, native keyboard controls, labels, selected-state announcements, disabled states, visible focus, reduced motion, and confirmation before replacing an unfinished run.


## Step-through capability practice

Open `/andon/?practice=guided`, or choose **Guided practice** in the game. The learner makes each manager decision, reviews its operational consequences, records optional reasoning, and moves through containment, timely observation, evidence-based recovery, restart, a countermeasure trial, pilot interpretation, and verification. Unsupported releases, delayed help, and premature claims can be rewound; their evidence remains in the practice record as an alternative branch.

**Try it yourself** uses a different receiving incident, a cautious operator, one responder, and strained conditions. The evidence may justify releasing normal work rather than prescribing a correction. Default coaching is hidden; requesting it is recorded. A reflection and an exportable Markdown trace support human review without presenting completion or a favorable simulation result as proof of capability.

Field observation uses a facilitator to answer other requests through ordinary simulation commands. Those support assignments are explicitly counted and kept separate from learner choices. The learner can take over the current operational state in the control room; facilitator support ends and unfinished control-room work requires confirmation before replacement. Timings and probabilities remain teaching assumptions.

This update changes:

- `source/practice.ts`: decision checkpoints, authored scenarios, consequence feedback, facilitator observation, rewind, and evidence export.
- `source/practice-view.tsx`: sequential tasks, evidence panels, coaching, reasoning, record review, reflection, and operational handoff.
- `source/page.tsx`: practice navigation, a visible launch action, deep link, and return to the live manager controls.
- `source/tests/practice.test.mjs`: operational checks for the guided and transfer loops and unsupported decisions.
- `source/tests/practice-ui.test.mjs`: rendered practice controls and their actual callbacks.
- `source/tests/ui.test.mjs`: existing game regression tests load the new practice view.
- `source/package.json`: the test command discovers all game tests.
- `style.css`: readable responsive practice panels, focus states, and narrow-screen navigation.
- `index.html`: new asset revision while preserving the accessibility preferences and skip link.
- `app.js` and `app.js.LEGAL.txt`: regenerated self-contained browser build and license notices.
- `../../tests/test_experiments_page.py`: asset-version-independent entrypoint check.
- `README.md`: practice scope, evidence limits, and changed-file record.

Twenty-nine automated tests pass, including rendered action callbacks and 200 seeded operating shifts. The guided decisions and unfamiliar incident are validated against the unchanged operational engine. Browser visual QA remains unavailable; no claim of browser accessibility conformance or validated managerial assessment is made.
