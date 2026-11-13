/** Open accessible help dialogs and show read-only excerpts of the exact served source. */
// @ts-check
import { GUIDE, HELP } from "./explanations.js";
import { SIMPLE } from "./simple.js";
const $ = (id) => document.getElementById(id),
  tray = $("code-tray"),
  help = $("help-dialog"),
  simple = $("simple-dialog");
let requested = 0,
  helpTopic = "overview";
/** @param {string} file @param {string|null} [start] @param {string|null} [end] @returns {Promise<void>} Fetch and number source without executing it. */
async function source(file, start = null, end = null) {
  const request = ++requested;
  $("source-status").textContent = "Loading source…";
  $("source-code").textContent = "";
  try {
    const response = await fetch(`/microgpt/${file}`);
    if (!response.ok) throw new Error("Source download failed.");
    const text = await response.text();
    if (request !== requested) return;
    const lines = text.split("\n"),
      first = start ? lines.findIndex((line) => line.includes(start)) : 0;
    const next = end
        ? lines.findIndex((line, i) => i > first && line.includes(end))
        : lines.length,
      last = next < 0 ? lines.length : next;
    if (first < 0)
      throw new Error(
        "This source excerpt could not be located. Choose the entire module.",
      );
    $("source-code").textContent = lines
      .slice(first, last)
      .map((line, i) => `${String(first + i + 1).padStart(3)}  ${line}`)
      .join("\n");
    $("source-status").textContent =
      `${file} · lines ${first + 1}–${last} · served source, not pseudocode`;
  } catch (error) {
    if (request === requested)
      $("source-status").textContent =
        error instanceof Error ? error.message : String(error);
  }
}
/** @param {string} key @returns {void} Load a stage explanation and its real implementation excerpt. */
function topic(key) {
  const item = GUIDE[key];
  if (!item) return;
  $("guide-topic").value = key;
  $("tray-title").textContent = item.title;
  $("guide-body").replaceChildren(
    ...item.paragraphs.map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    }),
  );
  $("guide-question").textContent = `Pause and explain: ${item.question}`;
  $("source-module").value = item.file;
  void source(item.file, item.start, item.end);
}
/** @param {string} key @returns {void} Show a modal tray with native focus containment and Escape support. */
function openTray(key) {
  if (help.open) help.close();
  topic(key);
  if (!tray.open) tray.showModal();
  tray.scrollTop = 0;
}
/** @param {string} key @returns {void} Open a shorter explanation above the current dialog and preserve its place. */
function openSimple(key) {
  const [title, ...paragraphs] = SIMPLE[key] ?? SIMPLE.overview;
  $("simple-title").textContent = title;
  $("simple-body").replaceChildren(
    ...paragraphs.map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    }),
  );
  simple.showModal();
}
$("help-simple").addEventListener("click", () => openSimple(helpTopic));
$("tray-simple").addEventListener("click", () =>
  openSimple($("guide-topic").value),
);
for (const [key, item] of Object.entries(GUIDE))
  $("guide-topic").append(new Option(item.title, key));
document.addEventListener("click", (event) => {
  const element = event.target instanceof Element ? event.target : null,
    simpler = element?.closest("[data-simple]"),
    guide = element?.closest("[data-guide]"),
    explain = element?.closest("[data-explain]");
  if (simpler) openSimple(simpler.dataset.simple);
  if (guide) openTray(guide.dataset.guide);
  if (explain) {
    const item = HELP[explain.dataset.explain];
    if (!item) return;
    $("help-title").textContent = item[0];
    $("help-text").textContent = item[1];
    helpTopic = item[2];
    help.showModal();
  }
});
$("guide-topic").addEventListener("change", () =>
  topic($("guide-topic").value),
);
$("source-module").addEventListener(
  "change",
  () => void source($("source-module").value),
);
$("show-full-source").addEventListener(
  "click",
  () => void source($("source-module").value),
);
$("help-more").addEventListener("click", () => openTray(helpTopic));
for (const dialog of [tray, help, simple])
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
