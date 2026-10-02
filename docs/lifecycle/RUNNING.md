# Run and replay

All current source lives in Capability Matters. The static website and local generation service share the public replay assets; generation uses the installed, authenticated Codex command-line interface and Python's standard library.

From the repository root:

```sh
npm run build
python3 tools/lifecycle/server.py
```

Open `http://127.0.0.1:8767`. The runner serves the built Capability Matters site and opens its replay workbench; rebuild after source changes. Offline scripted mode uses a fixed, labeled fictional workforce seed. It cannot refine arbitrary seeds. To enable real model calls:

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
