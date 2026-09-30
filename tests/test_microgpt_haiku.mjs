/** Verify whole-word learning, exact dataset boundaries and architecture-safe resumable haiku states. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HAIKU_MODES,
  splitTokens,
  joinTokens,
} from "../public/microgpt/haiku-tokens.js";
import { TinyGPT, dataset } from "../public/microgpt/engine.js";
import {
  HAIKU_LINES,
  HAIKU_VOCAB,
  wordTokens,
  joinWords,
} from "../public/microgpt/haiku-data.js";
const split = dataset("haiku"),
  train = split.train.flat(),
  test = split.test.flat();
assert.equal(train.length, 48);
assert.equal(test.length, 16);
assert.equal(new Set([...train, ...test]).size, 64);
assert(test.every((poem) => !train.includes(poem)));
assert(
  HAIKU_LINES.flat().every((line) =>
    train.some((poem) => poem.split("\n").includes(line)),
  ),
);
assert.deepEqual(HAIKU_VOCAB, [...new Set(train.flatMap(wordTokens))].sort());
assert.equal(HAIKU_VOCAB.length, 60);
for (const poem of [...train, ...test]) {
  assert.deepEqual(
    poem.split("\n").map((line) => line.split(" ").length),
    [5, 7, 5],
  );
  assert.equal(wordTokens(poem).length, 19);
  assert(wordTokens(poem).every((token) => HAIKU_VOCAB.includes(token)));
  assert.equal(joinWords(wordTokens(poem)), poem);
}
const model = new TinyGPT(0.5, "haiku"),
  initial = model.evaluate();
assert.equal(model.count, 3432);
assert.equal(model.config.context, 20);
assert.equal(model.config.vocabulary, 61);
assert.throws(() => model.loss("a word outside this vocabulary"));
assert.throws(() => model.loss(Array(21).fill("rain").join(" ")));
const loss = model.loss(train[0]);
model.tape.backward(loss);
for (const index of [12, 700, 1500, 3000]) {
  const gradient = model.tape.grad[index],
    weight = model.tape.value[index],
    epsilon = 1e-5;
  model.tape.value[index] = weight + epsilon;
  const plus = model.tape.value[model.loss(train[0])];
  model.tape.value[index] = weight - epsilon;
  const minus = model.tape.value[model.loss(train[0])];
  model.tape.value[index] = weight;
  assert(
    Math.abs(gradient - (plus - minus) / (2 * epsilon)) < 1e-5,
    `word-model gradient ${index}`,
  );
}
for (let i = 0; i < 100; i++) model.train();
assert(model.evaluate().test < initial.test - 0.5);
const saved = model.snapshot();
model.evaluate();
model.sample();
assert.deepEqual(model.snapshot(), saved);
const resumed = new TinyGPT();
resumed.restore(saved);
assert.equal(resumed.datasetId, "haiku");
assert.equal(resumed.count, 3432);
for (let i = 0; i < 5; i++) {
  model.train();
  resumed.train();
}
assert.deepEqual(model.snapshot(), resumed.snapshot());
for (const patch of [
  { tokenSignature: "changed" },
  { format: "capability-microgpt-v2" },
  { config: { ...saved.config, vocabulary: 60 } },
  { dataSignature: "changed" },
]) {
  const before = resumed.snapshot();
  assert.throws(() => resumed.restore({ ...saved, ...patch }));
  assert.deepEqual(
    resumed.snapshot(),
    before,
    "failed restore must preserve both architecture and state",
  );
}
const letters = new TinyGPT();
resumed.restore(letters.snapshot());
assert.deepEqual(resumed.snapshot(), letters.snapshot());
const bundle = JSON.parse(
  fs.readFileSync(
    new URL("../public/microgpt/haiku-checkpoints.json", import.meta.url),
  ),
);
assert.deepEqual(
  bundle.checkpoints.map((c) => c.step),
  [0, 100, 600],
);
for (const checkpoint of bundle.checkpoints) {
  resumed.restore(checkpoint);
  assert.deepEqual(resumed.evaluate(), checkpoint.metrics);
  assert.deepEqual(resumed.sample(), checkpoint.samples);
}
// Character and line variants use exactly the same corpus; only token units change.
for (const [id, spec] of Object.entries(HAIKU_MODES)) {
  assert.deepEqual(dataset(id), split);
  assert.deepEqual(
    spec.vocabulary,
    [...new Set(train.flatMap((p) => splitTokens(p, id)))].sort(),
  );
  for (const poem of [...train, ...test]) {
    assert.equal(joinTokens(splitTokens(poem, id), id), poem);
    assert(splitTokens(poem, id).length + 1 <= spec.context);
    assert(splitTokens(poem, id).every((t) => spec.vocabulary.includes(t)));
  }
  const variant = new TinyGPT(0.5, id),
    startLoss = variant.evaluate().test;
  const longest = [...train, ...test].sort((a, b) => b.length - a.length)[0];
  variant.loss(longest);
  assert(variant.tape.size < variant.tape.capacity);
  for (let step = 0; step < 100; step++) variant.train();
  assert(variant.evaluate().test < startLoss - 0.3, id);
  const checkpoint = variant.snapshot();
  const copy = new TinyGPT();
  copy.restore(checkpoint);
  variant.train();
  copy.train();
  assert.deepEqual(copy.snapshot(), variant.snapshot());
  const presets = JSON.parse(
    fs.readFileSync(
      new URL(`../public/microgpt/${id}-checkpoints.json`, import.meta.url),
    ),
  );
  assert.deepEqual(
    presets.checkpoints.map((c) => c.step),
    [0, 100, 600],
  );
  for (const c of presets.checkpoints) {
    copy.restore(c);
    assert.deepEqual(copy.evaluate(), c.metrics);
    assert.deepEqual(copy.sample(), c.samples);
  }
  if (id === "haiku-line")
    assert(
      copy
        .sample()
        .every(
          (text) =>
            text === "(empty)" ||
            text.split("\n").every((line) => spec.vocabulary.includes(line)),
        ),
    );
}
assert.equal(splitTokens(train[0], "haiku-line").length, 3);
assert.equal(splitTokens(train[0], "haiku").length, 19);
assert.equal(splitTokens(train[0], "haiku-char").length, train[0].length);
console.log(
  "PASS: same haiku corpus, three training-only vocabularies, complete-token gradients, learning in all modes, exact continuation, atomic restoration and all measured checkpoints.",
);
