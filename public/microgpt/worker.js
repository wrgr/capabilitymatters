/** Run model training off the page thread and preserve complete resumable checkpoints. */
// @ts-check
import { TinyGPT, CONFIG } from "./engine.js";
let model = new TinyGPT(),
  temperature = 0.8,
  generation = 0,
  running = false;
/** @type {Map<number,any>} */
let saved = new Map();
/** @returns {any} Measure and retain the current full state, with reproducible samples. */
function capture() {
  const metrics = model.evaluate(),
    checkpoint = { ...model.snapshot(), metrics };
  saved.set(model.step, checkpoint);
  return checkpoint;
}
/** @param {string} [message] @returns {void} Publish only measurements from the actual current model. */
function report(message = "") {
  const c = capture();
  self.postMessage({
    type: "state",
    running,
    step: model.step,
    share: model.share,
    metrics: c.metrics,
    samples: model.sample(temperature),
    temperature,
    message,
    history: [...saved.values()]
      .map((c) => ({ step: c.step, ...c.metrics }))
      .sort((a, b) => a.step - b.step),
  });
}
/** @param {number} token @param {number} target @returns {Promise<void>} Train in short chunks so pause and reset are handled between chunks. */
async function trainLoop(token, target) {
  try {
    while (token === generation && running && model.step < target) {
      for (let i = 0; i < 5 && model.step < target; i++) model.train();
      if (model.step % 50 === 0) report();
      self.postMessage({ type: "progress", step: model.step });
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    if (token === generation) {
      running = false;
      report("Training paused. Inspect or resume this checkpoint.");
    }
  } catch (error) {
    running = false;
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
/** @param {MessageEvent} event @returns {void} Dispatch explicit model actions without uploading data. */
function handle(event) {
  try {
    const { type } = event.data;
    if (type === "init") {
      generation++;
      running = false;
      model = new TinyGPT(event.data.share);
      saved = new Map();
      report("Fresh parameters. No training updates yet.");
    }
    if (type === "train" && !running) {
      running = true;
      generation++;
      void trainLoop(
        generation,
        Math.min(CONFIG.maxSteps, model.step + event.data.steps),
      );
    }
    if (type === "pause") {
      running = false;
      generation++;
      report("Paused. Weights and optimizer state are retained.");
    }
    if (type === "sample") {
      temperature = event.data.temperature;
      report(
        "New samples, unchanged weights. Sampling seed stays fixed for comparison.",
      );
    }
    if (type === "restore") {
      generation++;
      running = false;
      const snapshot = event.data.checkpoint ?? saved.get(event.data.step);
      if (!snapshot) throw new Error("That session checkpoint is unavailable.");
      model.restore(snapshot);
      saved = new Map([...saved].filter(([step]) => step <= model.step));
      if (event.data.checkpoint) saved = new Map();
      report(
        "Checkpoint restored. Training resumes from its optimizer and random state.",
      );
    }
    if (type === "download")
      self.postMessage({ type: "download", checkpoint: capture() });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
self.onmessage = handle;
