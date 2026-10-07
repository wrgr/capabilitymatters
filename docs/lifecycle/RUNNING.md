# Run and replay

All current source lives in Capability Matters. The static website and local generation service share the public replay assets; generation uses the installed, authenticated Codex command-line interface and Python's standard library.

From the repository root:

```sh
npm run build
python3 tools/lifecycle/server.py
```

Open `http://127.0.0.1:8767`. The runner serves the built Capability Matters homepage. Choose **Explore Agentic LE** for all three cases, or open `http://127.0.0.1:8767/agentic-le/replay/` directly; rebuild after source changes. Offline scripted mode uses a fixed, labeled fictional workforce seed. It cannot refine arbitrary seeds. To enable real model calls:

```sh
CAPABILITY_MATTERS_LIVE=1 python3 tools/lifecycle/server.py
```

Live mode sends the seed and accumulated public project discussion to the authenticated Codex service. Use fictional or approved material. Each role runs under a read-only sandbox; credentials are not copied into journals. The website hosts saved replay and products without a model secret.

Command-line generation:

```sh
python3 tools/lifecycle/engine.py --provider scripted
CAPABILITY_MATTERS_LIVE=1 python3 tools/lifecycle/engine.py \
  --provider codex --seed seed.json --domain-profile workforce-domain \
  --export public/agentic-le/replay/new-run.json
```

Omit `--seed` for the existing workforce seed. `--through design` performs a partial rehearsal. Complete cycles write a portable product under `data/lifecycle/<run-id>/product/`. Raw receipts, structured responses, prompts and append-only history remain under the run; response caches and provenance are under `data/cache/lifecycle/`. Both directories stay outside Git. The run's first event pins the resolved role contract and framework. Local replay can download a candidate handoff from `/api/products/<run-id>.zip`.

For public packaging, review a saved fictional export before committing it. `python3 scripts/package-lifecycle.py` rebuilds the role explorer contract, sandbox-frame resources and current exemplar product bundle. `npm run build` runs that packaging step before Astro. New arbitrary exports can be imported for transcript inspection; executable previews require their resources to be packaged. Raw CLI receipts are not included in public exports.

Verification:

```sh
npm run test:lifecycle
npm run test:prototypes
npm run build
```

The retained exemplar demonstrates a real implementation gap and correction. `repair_build.py` handles a stopped legacy journal whose Build draft contains no executable source. It preserves the original and appends a finding, corrected Build, and new Evaluate/Refine turns. Active writers, divergent journals and already executable builds are rejected. This is a bounded repair utility, not arbitrary checkpoint resumption. New Build turns reject an empty executable field and preserve failed outputs.

## Diverse live cases

The saved case catalog is defined in `src/data/lifecycle/cases.json`. The school-science and public-library seeds live in `src/data/lifecycle/seeds/`; their domain profiles inherit `contributor → specialist → domain` duties in registry 1.1.0. Each new run records its resolved profile, versions and hashes. The older workforce journal remains unchanged.

```sh
CAPABILITY_MATTERS_LIVE=1 python3 tools/lifecycle/engine.py --provider codex --seed src/data/lifecycle/seeds/school-science.json --domain-profile school-science-domain --export public/agentic-le/replay/school-science.json
CAPABILITY_MATTERS_LIVE=1 python3 tools/lifecycle/engine.py --provider codex --seed src/data/lifecycle/seeds/library-access.json --domain-profile library-access-domain --export public/agentic-le/replay/library-access.json
```

Executing these commands creates new live records; inspecting the hosted replay does not. Preserve a replaced export and its run directory before updating an exemplar. The normal build packages each case's candidate, evidence record and manifest, then produces `/agentic-le/cases.json` for case selection. Public replays use `?case=school-science` or `?case=library-access`, with an optional `&event=N` citation.

## Meeting conversation

Select **Meeting conversation** in the replay discussion panel, or use `?case=school-science&view=conversation`. The initial meeting view opens at the first saved stage artifact; explicit `event=` positions take precedence. It follows the same temporal snapshot and artifact revisions as recorded replay. Meeting playback skips provider requests while retaining discussion, stage and artifact checkpoints. Case switching, role filtering and timeline scrubbing work in both modes.

The overlay selects the first two complete message sentences, one recorded tension and the full next-step decision. It adds authored spoken bridges from the versioned voice profiles. It does not rewrite underlying claims or infer agreement from citations. Open **Original recorded turn** for full text, advantages, drawbacks, tradeoffs, risks, capability requirements, evidence references, prompt and provider record. Hypothetical challenges, technical records and pending human gates retain their status. The role-name voice applies only to an actual contribution; run metadata is labeled as a record.

**Distinct role voices** can be turned off without changing selected source text. **Export visible conversation** prepares a visible download link and inspectable, copyable Markdown adaptation of only the selected snapshot and role filter, with its presentation version, run identity and source event hashes. **Export run** remains the original journal. This presentation is not a transcript of a human meeting, new agent execution, or evidence of role proficiency. Personality does not change runtime contracts.
