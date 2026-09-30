/** Rebuild genuine deterministic transformer checkpoints using the exact browser engine. */
import fs from "node:fs";
import { TinyGPT } from "../public/microgpt/engine.js";
const model = new TinyGPT(0.5),
  checkpoints = [];
const started = performance.now();
for (const step of [0, 100, 600]) {
  while (model.step < step) model.train();
  checkpoints.push({
    ...model.snapshot(),
    metrics: model.evaluate(),
    samples: model.sample(0.8),
  });
}
const bundle = {
  description:
    "Measured checkpoints, generated with the same engine served to the browser. Balanced fictional spelling families; seed 42. Samples: temperature 0.8, seed 2026.",
  checkpoints,
};
fs.writeFileSync(
  new URL("../public/microgpt/checkpoints.json", import.meta.url),
  JSON.stringify(bundle),
);
console.log(
  JSON.stringify(
    {
      parameters: model.count,
      milliseconds: Math.round(performance.now() - started),
      checkpoints: checkpoints.map((c) => ({
        step: c.step,
        metrics: c.metrics,
        samples: c.samples,
      })),
    },
    null,
    2,
  ),
);
