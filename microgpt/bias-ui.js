/** Render real logistic-training results and matched-input probes for the synthetic bias teaching lab. */
// @ts-check
import {
  SCENARIOS,
  observations,
  makeClassifier,
  fitEpoch,
  audit,
  predict,
} from "./bias.js";
const $ = (id) => document.getElementById(id),
  percent = (x) => `${(100 * x).toFixed(1)}%`;
/** @param {string[]} values @returns {HTMLTableRowElement} Construct a safe text-only result row. */
function row(values) {
  const r = document.createElement("tr");
  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    r.append(cell);
  }
  return r;
}
/** @param {any} model @param {any} result @returns {void} Append measured outcomes and full error counts. */
function render(model, result) {
  const g = result.groups;
  $("bias-rows").append(
    row([
      model.scenario.name,
      percent(result.label),
      percent(result.accuracy),
      `${g.A.fn} / ${g.A.positive}`,
      `${g.B.fn} / ${g.B.positive}`,
    ]),
  );
  const block = document.createElement("p");
  block.textContent = `${model.scenario.name}: false positives A ${g.A.fp}/${g.A.negative}, B ${g.B.fp}/${g.B.negative}; held-out loss against this model's own labels ${result.loss.toFixed(3)}. Weights [intercept, ${model.scenario.features.join(", ")}]: ${model.weights.map((w) => w.toFixed(3)).join(", ")}.`;
  $("bias-audit").append(block);
  const high = predict(
    model.weights,
    { gaze: 0.8, posture: 0.8, evidence: 0.8 },
    model.scenario.features,
  );
  const low = predict(
    model.weights,
    { gaze: 0.25, posture: 0.25, evidence: 0.8 },
    model.scenario.features,
  );
  $("paired-rows").append(
    row([model.scenario.name, high.toFixed(3), low.toFixed(3)]),
  );
}
/** @returns {Promise<void>} Fit all scenarios with identical seeds and the same independent audit rows. */
async function run() {
  $("run-bias").disabled = true;
  $("bias-finding").hidden = true;
  $("paired-example").hidden = true;
  for (const id of ["bias-rows", "paired-rows", "bias-audit"])
    $(id).replaceChildren();
  const train = observations(111),
    test = observations(222),
    results = [];
  try {
    for (let i = 0; i < SCENARIOS.length; i++) {
      const model = makeClassifier(SCENARIOS[i]);
      for (let epoch = 0; epoch < 300; epoch++) {
        fitEpoch(model, train);
        if (epoch % 25 === 0) {
          $("bias-status").textContent =
            `Fitting ${model.scenario.name}: epoch ${epoch + 1} of 300.`;
          $("bias-progress").value = i * 300 + epoch + 1;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      const result = audit(model, test);
      results.push(result);
      render(model, result);
    }
    $("bias-progress").value = 1200;
    $("bias-status").textContent =
      "Complete. All values above were calculated from models trained in this browser.";
    const proxy = results[1],
      balanced = results[2];
    $("bias-finding").textContent =
      `The proxy model agrees with ${percent(proxy.label)} of its test labels, but misses ${proxy.groups.B.fn} of 100 engaged examples in B. Rebalancing leaves ${balanced.groups.B.fn} misses. The labeling rule itself still equates an outward display with engagement. Those results follow from the assumptions we deliberately built into this simulation.`;
    $("bias-finding").hidden = false;
    $("paired-example").hidden = false;
  } catch (error) {
    $("bias-status").textContent =
      `Experiment stopped: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    $("run-bias").disabled = false;
  }
}
$("run-bias").addEventListener("click", () => void run());
