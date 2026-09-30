/** Rebuild genuine deterministic transformer checkpoints using the exact browser engine. */
import fs from "node:fs";
import { TinyGPT } from "../public/microgpt/engine.js";
const checkpoints = [];
const started = performance.now();
for (const [datasetId, share, steps] of [
  ["fictional", 0.5, [0, 100, 600]],
  ["names", 0.5, [600]],
  ["names", 0.9, [600]],
  ["names", 0.1, [600]],
  ["haiku", 0.5, [0, 100, 600]],
  ["haiku-char", 0.5, [0, 100, 600]],
  ["haiku-line", 0.5, [0, 100, 600]],
]) {
  const model = new TinyGPT(share, datasetId);
  for (const step of steps) {
    while (model.step < step) model.train();
    checkpoints.push({
      ...model.snapshot(),
      metrics: model.evaluate(),
      samples: model.sample(0.8),
    });
  }
}
const bundle = {
  nameInitial: new TinyGPT(0.5, "names").evaluate(),
  description:
    "Measured checkpoints, generated with the same engine served to the browser. Fictional patterns and three study-name exposure mixes; seed 42. Samples: temperature 0.8, seed 2026.",
  checkpoints: checkpoints.filter((c) => !c.datasetId.startsWith("haiku")),
};
fs.writeFileSync(
  new URL("../public/microgpt/checkpoints.json", import.meta.url),
  JSON.stringify(bundle),
);
for (const id of ["haiku", "haiku-char", "haiku-line"]) {
  fs.writeFileSync(
    new URL(`../public/microgpt/${id}-checkpoints.json`, import.meta.url),
    JSON.stringify({
      description: `Measured ${id} transformer checkpoints on the same original teaching poems and split. Seed 42; samples use temperature 0.8 and seed 2026. Loss is per model token and not directly comparable across tokenizations.`,
      checkpoints: checkpoints.filter((c) => c.datasetId === id),
    }),
  );
}
console.log(
  JSON.stringify(
    {
      parameters: checkpoints[0].weights.length,
      milliseconds: Math.round(performance.now() - started),
      checkpoints: checkpoints.map((c) => ({
        datasetId: c.datasetId,
        share: c.share,
        step: c.step,
        metrics: c.metrics,
        samples: c.samples,
      })),
    },
    null,
    2,
  ),
);
