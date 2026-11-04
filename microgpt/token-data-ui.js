/** Show exact letter or haiku data and its actual token encoding for each introductory lab. */
import { dataset } from "./engine.js";
import { DATASETS } from "./datasets.js";
import { HAIKU_MODES, isHaiku, splitTokens } from "./haiku-tokens.js";
/** @param {HTMLElement} root @returns {void} Populate an independent inspector using the same pools and vocabulary as training. */
export function inspectTokens(root) {
  const id = root.dataset.dataset,
    words = isHaiku(id),
    data = dataset(id);
  const get = (key) => root.querySelector(`[data-control="${key}"]`);
  const vocabulary = words
    ? HAIKU_MODES[id].vocabulary
    : [..."abcdefghijklmnopqrstuvwxyz"];
  get("provenance").textContent = DATASETS[id].provenance;
  get("limits").textContent = DATASETS[id].limits;
  get("vocabulary").textContent =
    vocabulary.map((t, i) => `${visibleToken(t)} = ${i}`).join(" · ") +
    ` · [boundary] = ${vocabulary.length}`;
  get("data-caption").textContent =
    `${data.train.flat().length} training examples and ${data.test.flat().length} held-out examples. All exact text is shown.`;
  const rows = ["train", "test"].flatMap((split) =>
    data[split].flatMap((group) =>
      group.map((text, i) => ({
        text,
        use:
          split === "test"
            ? "Held out"
            : i < 8
              ? "Training · probe"
              : "Training",
        probability: split === "test" ? 0 : 0.5 / group.length,
      })),
    ),
  );
  get("data-rows").replaceChildren(
    ...rows.map((r) => exampleRow(r, () => showTokens(root, r.text))),
  );
  root.querySelector('[data-action="data-download"]').onclick = () =>
    exportData(id, rows);
  showTokens(root, root.dataset.selectedText || data.train[0][0]);
  if (words) {
    get("mode-explanation").textContent = HAIKU_MODES[id].explanation;
    get("sample-title").textContent =
      `Generated text · ${HAIKU_MODES[id].label.toLowerCase()} model`;
    get("loss-unit").textContent =
      `Current loss unit: one ${HAIKU_MODES[id].unit} token, including the final boundary. Compare learning within a mode; raw losses across modes measure different events.`;
  }
}
/** @param {string} text @returns {string} Make invisible character tokens explicit. */
function visibleToken(text) {
  return text === "\n" ? "[line break]" : text === " " ? "[space]" : text;
}
/** @param {HTMLElement} root @param {string} text @returns {void} Show the same poem in all three tokenizations without altering training. */
function showTokens(root, text) {
  root.dataset.selectedText = text;
  root.querySelector('[data-control="selected-text"]').textContent = text;
  const id = root.dataset.dataset;
  const views = isHaiku(id) ? Object.keys(HAIKU_MODES) : [id];
  root
    .querySelector('[data-control="tokens"]')
    .replaceChildren(...views.map((mode) => tokenView(text, mode, id)));
}
/** @param {string} text @param {string} mode @param {string} active @returns {HTMLElement} Build an inspectable token sequence with its real IDs and count. */
function tokenView(text, mode, active) {
  const spec = HAIKU_MODES[mode],
    vocabulary = spec?.vocabulary ?? [..."abcdefghijklmnopqrstuvwxyz"];
  const pieces = splitTokens(text, mode),
    panel = document.createElement("section"),
    title = document.createElement("h4"),
    count = document.createElement("p"),
    chips = document.createElement("div");
  panel.className = "token-view";
  panel.dataset.tokenMode = mode;
  title.textContent = `${spec?.label ?? "Letters"}${mode === active ? " · active model" : ""}`;
  count.textContent = `${pieces.length} content tokens + start/end markers. ${vocabulary.length + 1} IDs in this vocabulary.`;
  chips.className = "token-chips";
  chips.tabIndex = 0;
  const tokens = [
    ["[start]", vocabulary.length],
    ...pieces.map((p) => [visibleToken(p), vocabulary.indexOf(p)]),
    ["[end]", vocabulary.length],
  ];
  chips.append(
    ...tokens.map(([token, id]) => {
      const chip = document.createElement("code");
      chip.textContent = `${token} · ${id}`;
      return chip;
    }),
  );
  panel.append(title, count, chips);
  return panel;
}
/** @param {any} record @param {()=>void} select @returns {HTMLTableRowElement} Display one actual example without executing its contents. */
function exampleRow(record, select) {
  const row = document.createElement("tr");
  for (const value of [
    record.text,
    record.use,
    `${(record.probability * 100).toFixed(3)}%`,
  ]) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  const cell = document.createElement("td"),
    button = document.createElement("button");
  button.textContent = "Show tokens";
  button.addEventListener("click", select);
  cell.append(button);
  row.append(cell);
  return row;
}
/** @param {string} id @param {any[]} rows @returns {void} Download the full dataset with proper quoting for multiline poems. */
function exportData(id, rows) {
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const csv =
    "example,use,training_probability\n" +
    rows
      .map((r) => [r.text, r.use, r.probability].map(quote).join(","))
      .join("\n");
  const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `microgpt-${id}-examples.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
