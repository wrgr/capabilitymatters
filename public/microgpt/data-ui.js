/** Render exact active datasets and measured exposure comparisons so readers can audit training choices. */
import { dataset } from "./engine.js";
import { DATASETS, SCENARIOS } from "./datasets.js";
const $ = (id) => document.getElementById(id);
let active = { datasetId: "fictional", share: 0.5 },
  rows = [],
  signature = "";
/** @param {any} state @param {boolean} sync @returns {void} Identify the measured run independently of pending slider changes. */
export function showData(state, sync) {
  const meta = DATASETS[state.datasetId],
    data = dataset(state.datasetId);
  active = { datasetId: state.datasetId, share: state.share };
  $("active-dataset").textContent =
    `Active model: ${meta.title}. Training A:B = ${Math.round(state.share * 100)}:${Math.round((1 - state.share) * 100)}.`;
  $("group-key").textContent = meta.groups.join(". ") + ".";
  $("group-a-loss").textContent = state.metrics.a.toFixed(3);
  $("group-b-loss").textContent = state.metrics.b.toFixed(3);
  $("evaluation-counts").textContent =
    `The fixed training probe contains 16 examples; the held-out set contains ${data.test.flat().length} unseen examples (${data.test[0].length} per set).`;
  if (sync) {
    $("family-share").value = state.share * 100;
    $("share-value").textContent = `${Math.round(state.share * 100)}%`;
    const match = Object.entries(SCENARIOS).find(
      ([, s]) => s.dataset === state.datasetId && s.share === state.share,
    );
    $("data-scenario").value = match?.[0] ?? "custom";
  }
  const next = JSON.stringify(active);
  if (next === signature) return;
  signature = next;
  $("data-provenance").textContent = meta.provenance;
  $("data-group-key").textContent = meta.groups.join(". ") + ".";
  $("data-limits").textContent = meta.limits;
  $("data-source").hidden = !meta.source;
  if (meta.source) $("data-source").href = meta.source;
  rows = ["train", "test"].flatMap((split) =>
    data[split].flatMap((group, g) =>
      group.map((word, i) => ({
        word,
        group: g === 0 ? "A" : "B",
        use:
          split === "test"
            ? "Held out"
            : i < 8
              ? "Training · probe"
              : "Training",
        probability:
          split === "test"
            ? 0
            : (g === 0 ? active.share : 1 - active.share) / group.length,
      })),
    ),
  );
  drawRows();
}
/** @returns {void} Filter visible rows without changing the training or test pools. */
function drawRows() {
  const query = $("data-filter").value.trim().toLowerCase(),
    shown = rows.filter((r) => r.word.includes(query));
  $("data-count").textContent =
    `${shown.length} of ${rows.length} examples shown. Filtering changes this view only.`;
  $("data-caption").textContent =
    `${DATASETS[active.datasetId].title} · active training mix ${Math.round(active.share * 100)}:${Math.round((1 - active.share) * 100)}`;
  $("data-rows").replaceChildren(
    ...shown.map((r) => {
      const tr = document.createElement("tr");
      for (const value of [
        r.word,
        r.group,
        r.use,
        `${(r.probability * 100).toFixed(3)}%`,
      ]) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      return tr;
    }),
  );
}
/** @param {any[]} checkpoints @param {{test:number}} initial @param {(c:any)=>void} restore @returns {void} Compare actual models on the same fixed name test set. */
export function showComparisons(checkpoints, initial, restore) {
  const names = checkpoints.filter(
    (c) => c.datasetId === "names" && c.step === 600,
  );
  const baseline = names.find((c) => c.share === 0.5);
  if (!baseline || names.length !== 3)
    throw new Error("The three name comparisons are missing.");
  $("name-comparison").replaceChildren(
    ...names.map((c) => {
      const row = document.createElement("tr"),
        delta = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`;
      for (const value of [
        `${Math.round(c.share * 100)}:${Math.round((1 - c.share) * 100)}`,
        c.metrics.a.toFixed(3),
        c.metrics.b.toFixed(3),
        delta(c.metrics.a - baseline.metrics.a),
        delta(c.metrics.b - baseline.metrics.b),
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      const cell = document.createElement("td"),
        button = document.createElement("button");
      button.textContent = "Load model";
      button.dataset.preset = `names-${c.share}`;
      button.setAttribute(
        "aria-label",
        `Load name model with ${Math.round(c.share * 100)} percent set A`,
      );
      button.addEventListener("click", () => restore(c));
      cell.append(button);
      row.append(cell);
      return row;
    }),
  );
  $("name-finding").textContent =
    `Equal-exposure model: training-probe loss ${baseline.metrics.train.toFixed(3)}, held-out loss ${baseline.metrics.test.toFixed(3)}. Before any training, held-out loss was ${initial.test.toFixed(3)}. ${baseline.metrics.test > initial.test ? "Here, fitting a tiny list makes prediction on unseen names worse: a visible overfitting problem." : "In this run, training improves prediction on the held-out names."} Rebalancing alone does not guarantee better generalization.`;
  $("comparison-status").textContent =
    "Measured from the saved weights. Load a row to inspect or continue its model.";
}
/** @returns {void} Export all active examples, irrespective of the display filter. */
function downloadData() {
  const header = "dataset,example,set,use,training_probability\n";
  const csv =
    header +
    rows
      .map((r) =>
        [active.datasetId, r.word, r.group, r.use, r.probability].join(","),
      )
      .join("\n");
  const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `microgpt-${active.datasetId}-data.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("data-filter").addEventListener("input", drawRows);
$("download-data").addEventListener("click", downloadData);
