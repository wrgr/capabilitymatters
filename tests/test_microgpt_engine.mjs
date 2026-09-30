/** Verify real gradients, reproducible checkpoints and measurement-bias behavior in the browser engines. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { TinyGPT, Tape, dataset } from "../public/microgpt/engine.js";
import {
  SCENARIOS,
  observations,
  makeClassifier,
  fitEpoch,
  audit,
  predict,
} from "../public/microgpt/bias.js";
import { GUIDE, HELP } from "../public/microgpt/explanations.js";
import { SIMPLE } from "../public/microgpt/simple.js";
import {
  STUDY_NAMES,
  SCENARIOS as DATA_SCENARIOS,
} from "../public/microgpt/datasets.js";

const tape = new Tape(),
  a = tape.node(2),
  b = tape.node(3),
  loss = tape.add(tape.mul(a, b), a);
tape.backward(loss);
assert.equal(tape.grad[a], 4);
assert.equal(tape.grad[b], 2);
const split = dataset();
assert.equal(new Set(split.train.flat()).size, 160);
assert.equal(new Set(split.test.flat()).size, 32);
assert(split.test.flat().every((word) => !split.train.flat().includes(word)));

// All teaching pools are small, explicit, disjoint and compatible with the actual tokenizer.
const names = dataset("names");
assert.deepEqual(
  names.train.map((g) => g.length),
  [12, 12],
);
assert.deepEqual(
  names.test.map((g) => g.length),
  [6, 6],
);
assert.equal(new Set(STUDY_NAMES.flat()).size, 36);
assert(names.test.flat().every((word) => !names.train.flat().includes(word)));
assert(
  [...names.train.flat(), ...names.test.flat()].every((word) =>
    /^[a-z]{1,11}$/.test(word),
  ),
);
assert.deepEqual(
  names.test,
  STUDY_NAMES.map((g) => g.filter((_, i) => i % 3 === 2)),
);
for (const scenario of Object.values(DATA_SCENARIOS)) {
  const m = new TinyGPT(scenario.share, scenario.dataset);
  assert.deepEqual(m.data, dataset(scenario.dataset));
}
assert.throws(() => dataset("unknown"));
assert.throws(() => dataset("__proto__"));
assert.throws(() => new TinyGPT(1));
const nameModel = new TinyGPT(0.9, "names");
assert.deepEqual(
  nameModel.snapshot().weights,
  new TinyGPT().snapshot().weights,
);
for (let step = 0; step < 100; step++) nameModel.train();
const nameSaved = nameModel.snapshot();
const nameResume = new TinyGPT();
nameResume.restore(nameSaved);
assert.equal(nameResume.datasetId, "names");
assert.deepEqual(nameResume.data, names);
for (let step = 0; step < 5; step++) {
  nameModel.train();
  nameResume.train();
}
assert.deepEqual(nameModel.snapshot(), nameResume.snapshot());
for (const patch of [
  { datasetId: "unknown" },
  { datasetId: undefined },
  { dataSignature: "changed" },
]) {
  const before = nameResume.snapshot();
  assert.throws(() => nameResume.restore({ ...nameSaved, ...patch }));
  assert.deepEqual(
    nameResume.snapshot(),
    before,
    "failed import must not change active data or weights",
  );
}
const legacy = new TinyGPT().snapshot();
legacy.format = "capability-microgpt-v1";
delete legacy.datasetId;
delete legacy.dataSignature;
nameResume.restore(legacy);
assert.equal(
  nameResume.datasetId,
  "fictional",
  "original downloads must still restore their original data",
);
assert.deepEqual(nameResume.data, dataset());
for (const key of Object.keys(GUIDE)) assert(SIMPLE[key]?.length >= 3, key);
for (const item of Object.values(HELP)) assert(SIMPLE[item[2]], item[0]);

const model = new TinyGPT(),
  initial = model.evaluate().test;
// Compare analytical gradients with central differences through attention and embeddings.
const analyticalLoss = model.loss("babea");
model.tape.backward(analyticalLoss);
for (const index of [0, 13, 330, 800, 1200, 2300]) {
  const analytic = model.tape.grad[index],
    weight = model.tape.value[index],
    epsilon = 1e-5;
  model.tape.value[index] = weight + epsilon;
  const plus = model.tape.value[model.loss("babea")];
  model.tape.value[index] = weight - epsilon;
  const minus = model.tape.value[model.loss("babea")];
  model.tape.value[index] = weight;
  assert(
    Math.abs(analytic - (plus - minus) / (2 * epsilon)) < 1e-5,
    `gradient ${index}: ${analytic} vs ${(plus - minus) / (2 * epsilon)}`,
  );
}
for (let i = 0; i < 100; i++) model.train();
assert(model.evaluate().test < initial - 0.5);
const saved = model.snapshot(),
  samples = model.sample();
model.evaluate();
model.sample(0.2);
assert.deepEqual(
  model.snapshot(),
  saved,
  "inference must not alter resumable state",
);
for (let i = 0; i < 10; i++) model.train();
const future = model.snapshot();
const restored = new TinyGPT();
restored.restore(saved);
assert.deepEqual(restored.sample(), samples);
for (let i = 0; i < 10; i++) restored.train();
assert.deepEqual(restored.snapshot(), future, "checkpoint must resume exactly");
assert.throws(() => restored.restore({ ...saved, rng: -1 }));
assert.throws(() => restored.restore({ ...saved, v: saved.v.map(() => -1) }));

const bundle = JSON.parse(
  fs.readFileSync(
    new URL("../public/microgpt/checkpoints.json", import.meta.url),
  ),
);
assert.deepEqual(bundle.nameInitial, new TinyGPT(0.5, "names").evaluate());
assert.deepEqual(
  bundle.checkpoints.filter((c) => c.datasetId === "names").map((c) => c.share),
  [0.5, 0.9, 0.1],
);
for (const checkpoint of bundle.checkpoints) {
  restored.restore(checkpoint);
  assert.deepEqual(restored.evaluate(), checkpoint.metrics);
  assert.deepEqual(restored.sample(), checkpoint.samples);
}

const biased = new TinyGPT(0.9);
for (let i = 0; i < 600; i++) biased.train();
const balanced = bundle.checkpoints.find((c) => c.step === 600);
const evaluation = biased.evaluate();
assert(
  evaluation.b > balanced.metrics.b,
  "underrepresented family should degrade in this deterministic example",
);

const train = observations(111),
  test = observations(222),
  results = [];
for (const scenario of SCENARIOS) {
  const classifier = makeClassifier(scenario);
  for (let epoch = 0; epoch < 300; epoch++) fitEpoch(classifier, train);
  const result = audit(classifier, test);
  results.push(result);
  assert.equal(result.groups.A.positive, 100);
  assert.equal(result.groups.B.positive, 100);
  if (scenario.id === "evidence")
    assert.equal(
      predict(
        classifier.weights,
        { gaze: 0.8, posture: 0.8, evidence: 0.8 },
        scenario.features,
      ),
      predict(
        classifier.weights,
        { gaze: 0.25, posture: 0.25, evidence: 0.8 },
        scenario.features,
      ),
    );
}
assert(results[0].groups.B.fn > results[0].groups.A.fn + 40);
assert(results[1].label > 0.95 && results[1].groups.B.fn > 90);
assert(
  results[2].groups.B.fn > 90,
  "rebalancing cannot repair this constructed proxy",
);
assert(results[3].groups.B.fn < 30 && results[3].groups.A.fn < 30);
assert(
  results[3].accuracy < 1,
  "better-aligned synthetic evidence is still noisy",
);
for (const item of Object.values(GUIDE)) {
  const source = fs.readFileSync(
    new URL("../public/microgpt/" + item.file, import.meta.url),
    "utf8",
  );
  if (item.start) assert(source.includes(item.start), item.title);
  if (item.end)
    assert(
      source.indexOf(item.end, source.indexOf(item.start) + 1) >
        source.indexOf(item.start),
      item.title,
    );
}
console.log(
  "PASS: shared gradients, finite differences, disjoint data, learning, exact resume, real presets, sampling invariance, mixture effect, bias audits, data-bound snapshots, legacy imports, source and straightforward explanations.",
);
console.log(
  JSON.stringify(
    {
      initial,
      step100: saved.step,
      balanced: balanced.metrics,
      skewed: evaluation,
      bias: results.map((r) => ({
        agreement: r.label,
        accuracy: r.accuracy,
        missedA: r.groups.A.fn,
        missedB: r.groups.B.fn,
      })),
    },
    null,
    2,
  ),
);
