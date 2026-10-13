# Authoring guide

This is how to add and edit content. The engine is done; you write data. Use
**module 01 (`prediction`) in `src/data/modules.js` as the reference pattern** —
it exercises every feature.

## The mental model

One concept is rendered at **five views** and the engine assembles a "talk" from
**beats** (segments). You do **not** rewrite each idea five times. Instead you
write several short beats and tag each with the views it belongs to. The reader's
current view selects which beats appear.

Views (indices used by `minLevel`/`maxLevel`):

| idx | id | name | audience |
|----|-----------|----------------|------------------|
| 0 | picture | The picture | anyone |
| 1 | overview | Overview | no background |
| 2 | reasoning | Core reasoning | general public |
| 3 | hood | Under the hood | STEM background |
| 4 | formal | Formal | grad / researcher |

## Beats

```js
{
  id: "06-explain-tech",     // unique; convention: "<mod>-<role>-<variant>"
  role: "explain",           // hook | explain | example | misconception | stakes | formalism | check
  arc: "mechanistic",        // "mechanistic" | "meaning" (usually = module arc)
  minLevel: 3, maxLevel: 4,  // inclusive view-index range this beat appears in
  title: "Optional heading", // optional, used by formalism beats
  body: "....",              // markup string (see below)
  draft: true,               // optional; renders a small "draft" marker
}
```

### Roles and what they're for

- **hook** — open in the reader's world, name the stakes. Comes first. Usually
  spans all views (`minLevel:0, maxLevel:4`).
- **explain** — the core content. This is where the plain/technical split lives.
- **example** — a concrete instance or worked example.
- **misconception** — name a wrong mental model and correct it.
- **stakes** — why it matters / consequences.
- **formalism** — notation and derivations. **High views only** (`minLevel:3`).
- **check** — see below.

### The plain-first / fade-to-technical pattern (important)

Do **not** branch inside one beat. Write **two** `explain` beats:

```js
// plain words, lower views, term available on demand via [[...]]
{ id:"X-explain-plain", role:"explain", minLevel:0, maxLevel:2,
  body:"It reads word-chunks called [[token|tokens]], not letters." },

// technical, higher views, uses the term directly (still clickable)
{ id:"X-explain-tech",  role:"explain", minLevel:3, maxLevel:4,
  body:"A [[tokenizer]] maps text to integer IDs via byte-pair encoding..." },
```

This is what makes scaffolds fade as the view rises, and keeps experts from
re-reading the beginner version.

## Body markup

Beat bodies (and check questions/options/explanations) are strings with:

- `[[key]]` — a glossary term; shows the term's display name, click for popover.
- `[[key|display text]]` — same, but render `display text` inline.
- `$ ... $` — inline KaTeX, e.g. `$p_\theta(x_t \mid x_{<t})$`.
- `$$ ... $$` — display KaTeX (block).

Keep it un-nested (don't put `[[ ]]` inside `$ $`). Escape a literal `$` by
rephrasing; the parser is intentionally simple.

Every `key` must exist in `src/data/glossary.js` or the term renders in a warning
color. Add terms there:

```js
"my-key": {
  term: "Display Name",
  short: "One or two sentences for the popover.",
  long: "Optional fuller explanation.",         // optional
  seeAlso: ["other-key"],                        // optional
}
```

## Checks

```js
{
  id: "06-check", role: "check", arc: "mechanistic",
  minLevel: 0, maxLevel: 4,
  question: "Which best describes hallucination?",
  options: ["A rare bug...", "A structural consequence...", "Deliberate deception"],
  answer: 1,                       // index of the correct option
  explanation: "It follows from the generative mechanism itself...",
}
```

Write the check to test the module's `objective` (its can-do), not trivia. One
per module is the norm; you may add more.

## Modules

```js
{
  num: "06", arc: "mechanistic", slug: "hallucination",
  tab: "Hallucination",                        // short nav label
  title: "Why it confidently makes things up",
  objective: "After this, you can explain why hallucination is structural...",
  terms: ["hallucination", "grounding"],       // glossary keys -> chips
  draft: true,                                  // false when authored
  beats: [ ... ],
  sources: [ { authors, year, title, venue, link } ],
}
```

When a module is fully authored, set `draft: false` and remove any beat-level
`draft` flags. The "scaffold" banner disappears automatically.

## Sources / citations

- Add real, verified citations to each module's `sources`.
- For the meaning arc (09–14), candidate sources are listed in **code comments**
  above each module. Verify them (Crossref/arXiv/DOI) before moving them into
  `sources`.
- Pedagogy/design citations live in `src/data/pedagogy.js`.

## Checklist to finish a module

1. Write a `hook` spanning all views.
2. Write `explain-plain` (views 0–2) and `explain-tech` (views 3–4).
3. Add an `example` and a `misconception` where useful.
4. Add a `formalism` beat (views 3–4) if there's real notation.
5. Add a `stakes` beat if it connects to other modules or the meaning arc.
6. Write one `check` that tests the objective.
7. Ensure every `[[term]]` exists in the glossary.
8. Add verified `sources`. Set `draft: false`.
9. `npm run dev` and walk all five views to confirm the talk reads well at each.
