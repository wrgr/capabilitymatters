/** Connect the visible training lab to a background worker and render its measured states. */
// @ts-check
const $ = (id) => document.getElementById(id);
let worker,
  ready = false,
  running = false,
  currentStep = 0;
/** @param {string} text @returns {void} Surface engine failures instead of presenting stale output as current. */
function fail(text) {
  $("training-status").textContent = text;
  ready = false;
  setControls(false);
}
/** @param {boolean} busy @returns {void} Keep incompatible actions unavailable while training. */
function setControls(busy) {
  running = busy;
  for (const id of ["train-model", "train-long"])
    $(id).disabled = !ready || busy || currentStep >= 1200;
  for (const id of [
    "restore-session",
    "download-model",
    "resample-model",
    "import-checkpoint",
  ])
    $(id).disabled = !ready || busy;
  $("pause-model").disabled = !busy;
  document
    .querySelectorAll("[data-preset]")
    .forEach((b) => (b.disabled = busy || !ready));
}
/** @param {object} message @returns {void} Send an action to the actual worker. */
function send(message) {
  if (worker) worker.postMessage(message);
}
/** @param {any[]} history @returns {void} Plot actual probe losses with a shared zero-based vertical scale. */
function chart(history) {
  const max = Math.max(4, ...history.flatMap((c) => [c.train, c.test])),
    end = Math.max(100, ...history.map((c) => c.step));
  for (const [id, key] of [
    ["train-line", "train"],
    ["test-line", "test"],
  ]) {
    $(id).setAttribute(
      "points",
      history
        .map(
          (c) => `${45 + (530 * c.step) / end},${160 - (140 * c[key]) / max}`,
        )
        .join(" "),
    );
  }
  $("loss-chart-max").textContent = max.toFixed(1);
  $("loss-chart-end").textContent = String(end);
}
/** @param {any[]} history @returns {void} Provide exact accessible values and resumable state choices. */
function historyTable(history) {
  const body = $("history-rows"),
    select = $("session-checkpoint");
  body.replaceChildren();
  select.replaceChildren();
  for (const c of history) {
    const row = document.createElement("tr");
    for (const value of [
      String(c.step),
      c.train.toFixed(3),
      c.test.toFixed(3),
      c.a.toFixed(3),
      c.b.toFixed(3),
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
    const option = new Option(`Step ${c.step}`, String(c.step));
    select.append(option);
  }
  select.value = String(currentStep);
}
/** @param {any} state @returns {void} Update the interface only from actual worker results. */
function render(state) {
  ready = true;
  currentStep = state.step;
  setControls(state.running);
  $("step-value").textContent = String(state.step);
  $("training-progress").value = state.step;
  $("train-loss").textContent = state.metrics.train.toFixed(3);
  $("test-loss").textContent = state.metrics.test.toFixed(3);
  $("training-status").textContent = state.running
    ? `Training locally: ${state.step} updates. Checkpoint and measurements saved.`
    : state.message || "Ready.";
  $("word-samples").replaceChildren(
    ...state.samples.map((word) => {
      const code = document.createElement("code");
      code.textContent = word;
      return code;
    }),
  );
  chart(state.history);
  historyTable(state.history);
}
/** @param {any} checkpoint @returns {void} Download a genuine resumable model state. */
function download(checkpoint) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(checkpoint)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `microgpt-step-${checkpoint.step}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** @returns {void} Start a worker or explain why this browser cannot run it. */
function boot() {
  try {
    worker = new Worker("/microgpt/worker.js", { type: "module" });
    worker.onmessage = (event) => {
      const s = event.data;
      if (s.type === "state") render(s);
      if (s.type === "progress") {
        $("step-value").textContent = String(s.step);
        $("training-progress").value = s.step;
      }
      if (s.type === "download") download(s.checkpoint);
      if (s.type === "error") fail(s.message);
    };
    worker.onerror = () =>
      fail(
        "The training worker could not run. Reload the page to retry; the explanations and code remain available.",
      );
    send({ type: "init", share: 0.5 });
  } catch (error) {
    fail(
      `Browser training unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
/** @returns {Promise<void>} Load measured presets without blocking live training if the fetch fails. */
async function presets() {
  try {
    const response = await fetch("/microgpt/checkpoints.json");
    if (!response.ok) throw new Error("Checkpoint download failed.");
    const bundle = await response.json();
    $("preset-cards").replaceChildren();
    for (const checkpoint of bundle.checkpoints) {
      const card = document.createElement("article"),
        title = document.createElement("h4"),
        metric = document.createElement("p"),
        words = document.createElement("p"),
        button = document.createElement("button");
      title.textContent = `Step ${checkpoint.step}`;
      metric.textContent = `Held-out loss: ${checkpoint.metrics.test.toFixed(3)}`;
      words.textContent = checkpoint.samples.slice(0, 4).join(" · ");
      words.className = "preset-words";
      button.textContent = `Load step ${checkpoint.step}`;
      button.dataset.preset = String(checkpoint.step);
      button.disabled = running || !ready;
      button.addEventListener("click", () => {
        $("family-share").value = 50;
        $("share-value").textContent = "50%";
        send({ type: "restore", checkpoint });
      });
      card.append(title, metric, words, button);
      $("preset-cards").append(card);
    }
  } catch (error) {
    $("preset-cards").textContent =
      `Saved checkpoints unavailable: ${error instanceof Error ? error.message : String(error)} Live training still works.`;
  }
}
$("family-share").addEventListener(
  "input",
  () => ($("share-value").textContent = `${$("family-share").value}%`),
);
$("new-run").addEventListener("click", () => {
  ready = false;
  setControls(false);
  send({ type: "init", share: Number($("family-share").value) / 100 });
});
for (const [id, steps] of [
  ["train-model", 100],
  ["train-long", 600],
])
  $(id).addEventListener("click", () => {
    setControls(true);
    $("training-status").textContent = "Training locally…";
    send({ type: "train", steps });
  });
$("pause-model").addEventListener("click", () => send({ type: "pause" }));
$("restore-session").addEventListener("click", () =>
  send({ type: "restore", step: Number($("session-checkpoint").value) }),
);
$("download-model").addEventListener("click", () => send({ type: "download" }));
$("sample-temperature").addEventListener(
  "input",
  () =>
    ($("sample-temp-value").textContent = Number(
      $("sample-temperature").value,
    ).toFixed(1)),
);
$("resample-model").addEventListener("click", () =>
  send({ type: "sample", temperature: Number($("sample-temperature").value) }),
);
/** @returns {Promise<void>} Read a small checkpoint locally and let the engine validate it before restoring. */
async function importCheckpoint() {
  try {
    const file = $("import-checkpoint").files[0];
    if (!file) return;
    if (file.size > 1000000)
      throw new Error("Checkpoint file must be smaller than 1 MB.");
    const checkpoint = JSON.parse(await file.text());
    if (Number.isFinite(checkpoint.share)) {
      $("family-share").value = checkpoint.share * 100;
      $("share-value").textContent = `${checkpoint.share * 100}%`;
    }
    send({ type: "restore", checkpoint });
  } catch (error) {
    $("training-status").textContent =
      `Import failed: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    $("import-checkpoint").value = "";
  }
}
$("import-checkpoint").addEventListener(
  "change",
  () => void importCheckpoint(),
);
boot();
void presets();
