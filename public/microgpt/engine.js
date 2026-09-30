/** Original JavaScript implementation of the small-transformer teaching architecture demonstrated by Andrej Karpathy's microgpt; see NOTICE.md. */
// @ts-check
import { DATASETS, nameSplit } from "./datasets.js";
export const CONFIG = {
  width: 12,
  heads: 3,
  context: 12,
  vocabulary: 27,
  seed: 42,
  maxSteps: 1200,
};

/** Seeded pseudorandom generator whose state can be saved and restored. */
export class Random {
  /** @param {number} seed */
  constructor(seed) {
    this.state = seed >>> 0;
  }
  /** @returns {number} A reproducible uniform draw. */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** @returns {number} A normal draw with mean zero and unit variance. */
  normal() {
    return (
      Math.sqrt(-2 * Math.log(Math.max(1e-12, this.next()))) *
      Math.cos(2 * Math.PI * this.next())
    );
  }
}

/** Scalar differentiation tape with indexed edges and reusable storage. */
export class Tape {
  constructor() {
    this.size = 0;
    this.capacity = 500000;
    this.value = new Float64Array(this.capacity);
    this.grad = new Float64Array(this.capacity);
    this.a = new Int32Array(this.capacity);
    this.b = new Int32Array(this.capacity);
    this.da = new Float64Array(this.capacity);
    this.db = new Float64Array(this.capacity);
  }
  /** @param {number} value @param {number} [a] @param {number} [da] @param {number} [b] @param {number} [db] @returns {number} Append an operation. */
  node(value, a = -1, da = 0, b = -1, db = 0) {
    if (this.size >= this.capacity)
      throw new Error("Computation exceeds the bounded teaching model.");
    const i = this.size++;
    this.value[i] = value;
    this.a[i] = a;
    this.da[i] = da;
    this.b[i] = b;
    this.db[i] = db;
    return i;
  }
  /** @param {number} a @param {number} b @returns {number} Sum two nodes. */
  add(a, b) {
    return this.node(this.value[a] + this.value[b], a, 1, b, 1);
  }
  /** @param {number} a @param {number} b @returns {number} Multiply two nodes. */
  mul(a, b) {
    return this.node(
      this.value[a] * this.value[b],
      a,
      this.value[b],
      b,
      this.value[a],
    );
  }
  /** @param {number} a @param {number} c @returns {number} Scale a node. */
  scale(a, c) {
    return this.node(this.value[a] * c, a, c);
  }
  /** @param {number} a @param {number} c @returns {number} Shift a node. */
  shift(a, c) {
    return this.node(this.value[a] + c, a, 1);
  }
  /** @param {number} a @param {number} p @returns {number} Raise a node to a constant power. */
  pow(a, p) {
    return this.node(this.value[a] ** p, a, p * this.value[a] ** (p - 1));
  }
  /** @param {number} a @returns {number} Exponentiate a node. */
  exp(a) {
    const e = Math.exp(this.value[a]);
    return this.node(e, a, e);
  }
  /** @param {number} a @returns {number} Take a natural logarithm. */
  log(a) {
    return this.node(Math.log(this.value[a]), a, 1 / this.value[a]);
  }
  /** @param {number} a @returns {number} Rectified linear activation. */
  relu(a) {
    return this.node(Math.max(0, this.value[a]), a, this.value[a] > 0 ? 1 : 0);
  }
  /** @param {number[]} terms @returns {number} Sum nodes without a chain of zero constants. */
  sum(terms) {
    return terms.reduce((a, b) => this.add(a, b));
  }
  /** @param {number} loss @returns {void} Reverse the tape and accumulate all gradient paths. */
  backward(loss) {
    this.grad.fill(0, 0, this.size);
    this.grad[loss] = 1;
    for (let i = this.size - 1; i >= 0; i--) {
      if (this.a[i] >= 0) this.grad[this.a[i]] += this.grad[i] * this.da[i];
      if (this.b[i] >= 0) this.grad[this.b[i]] += this.grad[i] * this.db[i];
    }
  }
}

/** @param {string} [id] @returns {{train:string[][],test:string[][]}} Return the exact disjoint training and test pools for a declared dataset. */
export function dataset(id = "fictional") {
  if (!Object.hasOwn(DATASETS, id))
    throw new Error("Unknown training dataset.");
  if (id === "names") return nameSplit();
  const random = new Random(731),
    families = [
      ["bdglmnr", "ae", "a"],
      ["kpstvz", "iou", "o"],
    ];
  const groups = families.map(([cs, vs, end]) => {
    const names = new Set();
    while (names.size < 96) {
      let word = "";
      const length = random.next() < 0.5 ? 2 : 3;
      for (let i = 0; i < length; i++)
        word +=
          cs[Math.floor(random.next() * cs.length)] +
          vs[Math.floor(random.next() * vs.length)];
      names.add(word + end);
    }
    return [...names];
  });
  return {
    train: groups.map((g) => g.slice(0, 80)),
    test: groups.map((g) => g.slice(80)),
  };
}

/** Small causal transformer with real backpropagation and Adam updates. */
export class TinyGPT {
  /** @param {number} [share] @param {string} [datasetId] Initialize a model with a declared dataset and probability of sampling set A. */
  constructor(share = 0.5, datasetId = "fictional") {
    if (!Number.isFinite(share) || share < 0.1 || share > 0.9)
      throw new Error("Training mix must be between 10% and 90%.");
    this.random = new Random(CONFIG.seed);
    this.share = share;
    this.step = 0;
    this.tape = new Tape();
    this.datasetId = datasetId;
    this.data = dataset(datasetId);
    this.width = CONFIG.width;
    this.embedding = this.matrix(27, 12);
    this.position = this.matrix(12, 12);
    this.output = this.matrix(27, 12);
    this.query = this.matrix(12, 12);
    this.key = this.matrix(12, 12);
    this.val = this.matrix(12, 12);
    this.project = this.matrix(12, 12);
    this.up = this.matrix(48, 12);
    this.down = this.matrix(12, 48);
    this.count = this.tape.size;
    this.m = new Float64Array(this.count);
    this.v = new Float64Array(this.count);
  }
  /** @param {number} rows @param {number} columns @returns {number[][]} Create a parameter matrix. */
  matrix(rows, columns) {
    return Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () =>
        this.tape.node(this.random.normal() * 0.08),
      ),
    );
  }
  /** @param {number[]} x @param {number[][]} w @returns {number[]} Learned linear projection. */
  linear(x, w) {
    return w.map((row) =>
      this.tape.sum(row.map((p, j) => this.tape.mul(p, x[j]))),
    );
  }
  /** @param {number[]} x @returns {number[]} Normalize root mean square activation. */
  norm(x) {
    const t = this.tape,
      mean = t.scale(t.sum(x.map((v) => t.mul(v, v))), 1 / x.length);
    const scale = t.pow(t.shift(mean, 1e-5), -0.5);
    return x.map((v) => t.mul(v, scale));
  }
  /** @param {number[]} x @returns {number[]} Stable softmax on graph nodes. */
  softmax(x) {
    const t = this.tape,
      max = Math.max(...x.map((i) => t.value[i]));
    const exp = x.map((i) => t.exp(t.shift(i, -max))),
      inverse = t.pow(t.sum(exp), -1);
    return exp.map((i) => t.mul(i, inverse));
  }
  /** @param {number[]} x @param {{keys:number[][],values:number[][]}} cache @returns {number[]} Causal multi-head attention. */
  attention(x, cache) {
    const t = this.tape,
      q = this.linear(x, this.query),
      k = this.linear(x, this.key),
      v = this.linear(x, this.val);
    cache.keys.push(k);
    cache.values.push(v);
    const joined = [];
    for (let h = 0; h < CONFIG.heads; h++) {
      const offset = h * 4;
      const scores = cache.keys.map((key) =>
        t.scale(
          t.sum(
            q
              .slice(offset, offset + 4)
              .map((a, j) => t.mul(a, key[offset + j])),
          ),
          0.5,
        ),
      );
      const weights = this.softmax(scores);
      for (let j = 0; j < 4; j++)
        joined.push(
          t.sum(weights.map((w, i) => t.mul(w, cache.values[i][offset + j]))),
        );
    }
    return this.linear(joined, this.project);
  }
  /** @param {number} token @param {number} position @param {{keys:number[][],values:number[][]}} cache @returns {number[]} Predict next-token logits. */
  forward(token, position, cache) {
    const t = this.tape;
    let x = this.norm(
      this.embedding[token].map((id, j) =>
        t.add(id, this.position[position][j]),
      ),
    );
    const att = this.attention(this.norm(x), cache);
    x = x.map((id, j) => t.add(id, att[j]));
    const hidden = this.linear(this.norm(x), this.up).map((id) => t.relu(id));
    const feed = this.linear(hidden, this.down);
    x = x.map((id, j) => t.add(id, feed[j]));
    return this.linear(x, this.output);
  }
  /** @param {string} word @returns {number} Construct sequence-mean next-token loss at temperature one. */
  loss(word) {
    this.tape.size = this.count;
    const t = this.tape,
      cache = { keys: [], values: [] };
    const tokens = [26, ...[...word].map((c) => c.charCodeAt(0) - 97), 26],
      terms = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      const p = this.softmax(this.forward(tokens[i], i, cache));
      terms.push(t.scale(t.log(p[tokens[i + 1]]), -1));
    }
    return t.scale(t.sum(terms), 1 / terms.length);
  }
  /** @returns {number} Perform one genuine training update on a sampled document. */
  train() {
    if (this.step >= CONFIG.maxSteps)
      throw new Error("Run complete. Start a new run or inspect a checkpoint.");
    const group = this.random.next() < this.share ? 0 : 1,
      docs = this.data.train[group];
    const loss = this.loss(docs[Math.floor(this.random.next() * docs.length)]),
      result = this.tape.value[loss];
    if (!Number.isFinite(result))
      throw new Error("Training became non-finite. Reset the run.");
    this.tape.backward(loss);
    this.step++;
    const rate = 0.006 * (1 - (0.8 * this.step) / CONFIG.maxSteps);
    for (let i = 0; i < this.count; i++) {
      const g = this.tape.grad[i];
      this.m[i] = 0.9 * this.m[i] + 0.1 * g;
      this.v[i] = 0.99 * this.v[i] + 0.01 * g * g;
      const corrected = this.m[i] / (1 - 0.9 ** this.step),
        variance = this.v[i] / (1 - 0.99 ** this.step);
      this.tape.value[i] -= (rate * corrected) / (Math.sqrt(variance) + 1e-8);
    }
    return result;
  }
  /** @returns {{train:number,test:number,a:number,b:number}} Evaluate fixed balanced probes, not the last training example. */
  evaluate() {
    const mean = (docs) =>
      docs.reduce((sum, word) => sum + this.tape.value[this.loss(word)], 0) /
      docs.length;
    const a = mean(this.data.test[0]),
      b = mean(this.data.test[1]);
    return {
      train: mean(this.data.train.flatMap((g) => g.slice(0, 8))),
      test: (a + b) / 2,
      a,
      b,
    };
  }
  /** @param {number} [temperature] @param {number} [seed] @param {number} [number] @returns {string[]} Sample with an independent RNG so generation cannot change training. */
  sample(temperature = 0.8, seed = 2026, number = 8) {
    const random = new Random(seed),
      results = [];
    for (let s = 0; s < number; s++) {
      this.tape.size = this.count;
      const cache = { keys: [], values: [] };
      let token = 26,
        word = "";
      for (let position = 0; position < CONFIG.context; position++) {
        const ids = this.forward(token, position, cache),
          logits = ids.map((i) => this.tape.value[i] / temperature),
          max = Math.max(...logits);
        const weights = logits.map((v) => Math.exp(v - max)),
          total = weights.reduce((a, b) => a + b, 0);
        let draw = random.next() * total;
        token = weights.length - 1;
        for (let j = 0; j < weights.length; j++) {
          draw -= weights[j];
          if (draw <= 0) {
            token = j;
            break;
          }
        }
        if (token === 26) break;
        word += String.fromCharCode(97 + token);
      }
      results.push(word || "(empty)");
    }
    return results;
  }
  /** @returns {object} Save weights, optimizer and random state for exact continuation. */
  snapshot() {
    return {
      format: "capability-microgpt-v2",
      datasetId: this.datasetId,
      dataSignature: JSON.stringify(this.data),
      config: CONFIG,
      share: this.share,
      step: this.step,
      rng: this.random.state,
      weights: Array.from(this.tape.value.slice(0, this.count)),
      m: Array.from(this.m),
      v: Array.from(this.v),
    };
  }
  /** @param {any} s @returns {void} Restore a validated checkpoint with matching architecture. */
  restore(s) {
    if (!s || typeof s !== "object")
      throw new Error("Checkpoint must be a JSON model state.");
    if (
      !["capability-microgpt-v1", "capability-microgpt-v2"].includes(
        s.format,
      ) ||
      JSON.stringify(s.config) !== JSON.stringify(CONFIG)
    )
      throw new Error("Checkpoint architecture does not match.");
    validateParameters(s, this.count);
    if (
      !Number.isInteger(s.step) ||
      s.step < 0 ||
      s.step > CONFIG.maxSteps ||
      !Number.isFinite(s.share) ||
      s.share < 0.1 ||
      s.share > 0.9
    )
      throw new Error("Checkpoint settings are invalid.");
    const datasetId =
      s.format === "capability-microgpt-v1" ? "fictional" : s.datasetId;
    if (typeof datasetId !== "string")
      throw new Error("Checkpoint dataset is missing.");
    const data = dataset(datasetId);
    if (
      s.format === "capability-microgpt-v2" &&
      s.dataSignature !== JSON.stringify(data)
    )
      throw new Error("Checkpoint training data does not match this version.");
    this.datasetId = datasetId;
    this.data = data;
    this.tape.value.set(s.weights);
    this.m.set(s.m);
    this.v.set(s.v);
    this.step = s.step;
    this.share = s.share;
    this.random.state = s.rng >>> 0;
    this.tape.size = this.count;
  }
}

/** @param {any} s @param {number} count @returns {void} Reject corrupt numerical state before a checkpoint changes the active model. */
function validateParameters(s, count) {
  for (const field of ["weights", "m", "v"])
    if (
      !Array.isArray(s[field]) ||
      s[field].length !== count ||
      !s[field].every(Number.isFinite)
    )
      throw new Error("Checkpoint contains invalid parameters.");
  if (
    !Number.isInteger(s.rng) ||
    s.rng < 0 ||
    s.rng > 4294967295 ||
    s.v.some((x) => x < 0)
  )
    throw new Error("Checkpoint optimizer or random state is invalid.");
}
