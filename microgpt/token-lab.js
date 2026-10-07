/** Run independent letter and selectable haiku-token teaching labs through the shared transformer worker. */
import { inspectTokens } from "./token-data-ui.js";
import { isHaiku } from "./haiku-tokens.js";
/** One scoped interface owns one worker so the introductory examples never reset each other. */
class TokenLab {
  /** @param {HTMLElement} root Initialize this example and its inspector. */
  constructor(root) {
    this.root = root;
    this.id = root.dataset.dataset;
    this.ready = false;
    this.busy = false;
    this.step = 0;
    this.presets = [];
    inspectTokens(root);
    root.addEventListener("click", (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest("[data-action]")
          : null;
      if (button) this.action(button.dataset.action, button.dataset.steps);
    });
    this.get("temperature").addEventListener("input", () => {
      this.get("temperature-value").textContent = Number(
        this.get("temperature").value,
      ).toFixed(1);
    });
    this.get("import").addEventListener(
      "change",
      () => void this.importState(),
    );
    this.get("mode")?.addEventListener("change", () => this.changeMode());
    this.boot();
    void this.loadPresets();
  }
  /** @returns {void} Start the selected tokenization while preserving the inspected poem and other examples. */
  changeMode() {
    this.id = this.get("mode").value;
    this.root.dataset.dataset = this.id;
    this.presets = [];
    this.get("preset").replaceChildren(
      new Option("Loading this tokenization's checkpoints…", ""),
    );
    inspectTokens(this.root);
    this.action("reset");
    void this.loadPresets();
  }
  /** @param {string} key @returns {any} Find a control only inside this example. */
  get(key) {
    return this.root.querySelector(`[data-control="${key}"]`);
  }
  /** @param {object} message @returns {void} Send an instruction to this example's worker. */
  send(message) {
    this.worker?.postMessage(message);
  }
  /** @returns {void} Start the shared engine in an independent background thread. */
  boot() {
    try {
      this.worker = new Worker("/microgpt/worker.js", { type: "module" });
      this.worker.onmessage = ({ data }) => this.receive(data);
      this.worker.onerror = () =>
        this.fail(
          "This training worker could not run. Reload to retry; the examples and explanations remain available.",
        );
      this.action("reset");
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
  }
  /** @param {string} message @returns {void} Report failure without replacing measured results with invented values. */
  fail(message) {
    this.controls(false);
    this.get("status").textContent = message;
  }
  /** @param {boolean} busy @returns {void} Disable conflicting actions while preserving reset and pause. */
  controls(busy) {
    this.busy = busy;
    for (const b of this.root.querySelectorAll("[data-action]")) {
      const action = b.dataset.action;
      if (["reset", "data-download"].includes(action)) continue;
      b.disabled =
        action === "pause"
          ? !busy
          : !this.ready ||
            busy ||
            (action === "train" && this.step >= 1200) ||
            (action === "preset" && !this.presets.length);
    }
    this.get("import").disabled = !this.ready || busy;
  }
  /** @param {string} action @param {string} [steps] @returns {void} Translate explicit controls into worker actions. */
  action(action, steps) {
    if (action === "reset") {
      this.ready = false;
      this.controls(false);
      this.get("status").textContent =
        "Starting a fresh model for the selected tokens…";
      this.get("step").textContent = "0";
      this.get("progress").value = 0;
      for (const key of ["train-loss", "test-loss"])
        this.get(key).textContent = "—";
      for (const key of ["samples", "history", "session"])
        this.get(key).replaceChildren();
      for (const key of ["train-line", "test-line"])
        this.get(key).setAttribute("points", "");
      this.send({ type: "init", share: 0.5, datasetId: this.id });
    }
    if (action === "train") {
      this.controls(true);
      this.get("status").textContent = "Training locally…";
      this.send({ type: "train", steps: Number(steps) });
    }
    if (action === "pause") this.send({ type: "pause" });
    if (action === "sample")
      this.send({
        type: "sample",
        temperature: Number(this.get("temperature").value),
      });
    if (action === "restore")
      this.send({ type: "restore", step: Number(this.get("session").value) });
    if (action === "preset")
      this.send({
        type: "restore",
        checkpoint: this.presets[Number(this.get("preset").value)],
      });
    if (action === "download") this.send({ type: "download" });
  }
  /** @param {any} state @returns {void} Render only measured worker state belonging to this example. */
  receive(state) {
    if (state.datasetId && state.datasetId !== this.id) return;
    if (state.type === "error") {
      this.fail(state.message);
      return;
    }
    if (state.type === "download") {
      this.download(state.checkpoint);
      return;
    }
    if (state.type === "progress") {
      this.get("step").textContent = String(state.step);
      this.get("progress").value = state.step;
      return;
    }
    if (state.type !== "state") return;
    this.ready = true;
    this.step = state.step;
    this.controls(state.running);
    this.get("step").textContent = String(state.step);
    this.get("progress").value = state.step;
    this.get("train-loss").textContent = state.metrics.train.toFixed(3);
    this.get("test-loss").textContent = state.metrics.test.toFixed(3);
    this.get("status").textContent = state.running
      ? `Training locally: ${state.step} updates.`
      : state.message;
    this.get("model-info").textContent =
      `${state.parameters.toLocaleString()} adjustable parameters · ${state.config.vocabulary} token IDs including boundary · up to ${state.config.context} prediction positions · one transformer block, three attention heads.`;
    this.get("samples").replaceChildren(
      ...state.samples.slice(0, isHaiku(this.id) ? 3 : 8).map((text) => {
        const node = document.createElement(isHaiku(this.id) ? "pre" : "code");
        node.textContent = text;
        if (isHaiku(this.id)) node.tabIndex = 0;
        return node;
      }),
    );
    this.trace(state.history);
  }
  /** @param {any[]} history @returns {void} Plot observed losses and list exact resumable measurements. */
  trace(history) {
    const max = Math.max(4, ...history.flatMap((c) => [c.train, c.test])),
      end = Math.max(100, ...history.map((c) => c.step));
    for (const key of ["train", "test"])
      this.get(`${key}-line`).setAttribute(
        "points",
        history
          .map(
            (c) => `${45 + (530 * c.step) / end},${160 - (140 * c[key]) / max}`,
          )
          .join(" "),
      );
    this.get("chart-max").textContent = max.toFixed(1);
    this.get("chart-end").textContent = String(end);
    this.get("history").replaceChildren(
      ...history.map((c) => {
        const row = document.createElement("tr");
        for (const value of [
          String(c.step),
          c.train.toFixed(3),
          c.test.toFixed(3),
        ]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        return row;
      }),
    );
    this.get("session").replaceChildren(
      ...history.map((c) => new Option(`Step ${c.step}`, String(c.step))),
    );
    this.get("session").value = String(this.step);
  }
  /** @returns {Promise<void>} Fetch genuine dataset-specific checkpoints without blocking local training. */
  async loadPresets() {
    const datasetId = this.id;
    try {
      const file = isHaiku(datasetId)
        ? `${datasetId}-checkpoints.json`
        : "checkpoints.json";
      const response = await fetch(`/microgpt/${file}`);
      if (!response.ok) throw new Error("Saved checkpoint download failed.");
      const bundle = await response.json();
      if (datasetId !== this.id) return;
      this.presets = bundle.checkpoints.filter((c) => c.datasetId === this.id);
      if (!this.presets.length)
        throw new Error("No matching saved checkpoints.");
      this.get("preset").replaceChildren(
        ...this.presets.map(
          (c, i) =>
            new Option(
              `Step ${c.step} · held-out loss ${c.metrics.test.toFixed(3)}`,
              String(i),
            ),
        ),
      );
      this.controls(this.busy);
    } catch (error) {
      if (datasetId !== this.id) return;
      this.get("preset").replaceChildren(
        new Option(error instanceof Error ? error.message : String(error), ""),
      );
    }
  }
  /** @param {any} checkpoint @returns {void} Export the real resumable state as a local JSON file. */
  download(checkpoint) {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(checkpoint)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `microgpt-${checkpoint.datasetId}-step-${checkpoint.step}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  /** @returns {Promise<void>} Accept only this example's checkpoint before the engine validates all state. */
  async importState() {
    try {
      const file = this.get("import").files[0];
      if (!file) return;
      if (file.size > 1000000)
        throw new Error("Checkpoint must be smaller than 1 MB.");
      const checkpoint = JSON.parse(await file.text());
      const id =
        checkpoint.format === "capability-microgpt-v1"
          ? "fictional"
          : checkpoint.datasetId;
      if (id !== this.id)
        throw new Error(
          "This checkpoint belongs to another example or tokenization. Select its mode before importing.",
        );
      this.send({ type: "restore", checkpoint });
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    } finally {
      this.get("import").value = "";
    }
  }
}
for (const root of document.querySelectorAll("[data-token-lab]"))
  new TokenLab(root);
