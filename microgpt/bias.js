/** Fit transparent logistic models to invented engagement scenarios, keeping proxy labels separate from an assumed latent criterion. */
// @ts-check
import { Random } from "./engine.js";
export const SCENARIOS = [
  {
    id: "explicit",
    name: "Deliberately biased labels",
    share: 0.5,
    features: ["gaze", "posture", "evidence"],
    target: "Half of engaged B examples relabeled negative",
  },
  {
    id: "proxy",
    name: "Inadvertent proxy bias",
    share: 0.9,
    features: ["gaze", "posture"],
    target: "Camera-facing + stillness rubric",
  },
  {
    id: "balanced",
    name: "Rebalance the same proxy",
    share: 0.5,
    features: ["gaze", "posture"],
    target: "Same camera-facing + stillness rubric",
  },
  {
    id: "evidence",
    name: "Change target and evidence",
    share: 0.5,
    features: ["evidence"],
    target: "Assumed engagement state in this simulation",
  },
];
/** @param {number} seed @returns {any[]} Generate equal-size fictional contexts with identical engagement prevalence. */
export function observations(seed) {
  const random = new Random(seed),
    rows = [];
  const clamp = (x) => Math.max(0, Math.min(1, x));
  for (const group of ["A", "B"])
    for (let i = 0; i < 200; i++) {
      const y = i % 2,
        noise = () => random.normal() * 0.12;
      // B differs in display pattern, never in latent engagement prevalence or task evidence.
      const gaze = clamp(
        (group === "A" ? (y ? 0.78 : 0.25) : y ? 0.27 : 0.33) + noise(),
      );
      const posture = clamp(
        (group === "A" ? (y ? 0.78 : 0.3) : y ? 0.38 : 0.43) + noise(),
      );
      const evidence = clamp((y ? 0.7 : 0.3) + random.normal() * 0.2);
      rows.push({ group, y, gaze, posture, evidence, flip: i % 4 === 1 });
    }
  return rows;
}
/** @param {any} row @param {string} scenario @returns {number} Define what the trainer calls a correct label. */
export function target(row, scenario) {
  if (scenario === "explicit")
    return row.group === "B" && row.y && row.flip ? 0 : row.y;
  if (scenario === "proxy" || scenario === "balanced")
    return (row.gaze + row.posture) / 2 > 0.55 ? 1 : 0;
  return row.y;
}
/** @param {number[]} weights @param {any} row @param {string[]} features @returns {number} Score the training target, not a validated probability of human engagement. */
export function predict(weights, row, features) {
  const z =
    weights[0] +
    features.reduce(
      (sum, key, i) => sum + weights[i + 1] * (row[key] - 0.5) * 2,
      0,
    );
  return 1 / (1 + Math.exp(-z));
}
/** @param {any} scenario @returns {any} Initialize a transparent logistic regression. */
export function makeClassifier(scenario) {
  return {
    scenario,
    weights: Array(scenario.features.length + 1).fill(0),
    epoch: 0,
  };
}
/** @param {any} model @param {any[]} rows @returns {number} Apply one full-batch weighted gradient update. */
export function fitEpoch(model, rows) {
  const { scenario: s, weights: w } = model,
    g = Array(w.length).fill(0);
  let loss = 0;
  for (const row of rows) {
    const weight = (row.group === "A" ? s.share : 1 - s.share) / 200,
      p = predict(w, row, s.features),
      y = target(row, s.id);
    const error = (p - y) * weight;
    g[0] += error;
    s.features.forEach((key, i) => (g[i + 1] += error * (row[key] - 0.5) * 2));
    loss -=
      weight *
      (y * Math.log(Math.max(p, 1e-12)) +
        (1 - y) * Math.log(Math.max(1 - p, 1e-12)));
  }
  for (let i = 0; i < w.length; i++) w[i] -= 0.5 * g[i];
  model.epoch++;
  return loss;
}
/** @param {any} model @param {any[]} rows @returns {any} Report held-out label agreement and errors against the independent synthetic criterion. */
export function audit(model, rows) {
  const s = model.scenario;
  let label = 0,
    correct = 0,
    loss = 0;
  const groups = {
    A: { fn: 0, fp: 0, positive: 0, negative: 0 },
    B: { fn: 0, fp: 0, positive: 0, negative: 0 },
  };
  for (const row of rows) {
    const p = predict(model.weights, row, s.features),
      prediction = p >= 0.5 ? 1 : 0,
      y = target(row, s.id),
      g = groups[row.group];
    label += prediction === y ? 1 : 0;
    correct += prediction === row.y ? 1 : 0;
    loss -=
      (y * Math.log(Math.max(p, 1e-12)) +
        (1 - y) * Math.log(Math.max(1 - p, 1e-12))) /
      rows.length;
    if (row.y) {
      g.positive++;
      g.fn += prediction === 0 ? 1 : 0;
    } else {
      g.negative++;
      g.fp += prediction === 1 ? 1 : 0;
    }
  }
  return {
    label: label / rows.length,
    accuracy: correct / rows.length,
    loss,
    groups,
  };
}
