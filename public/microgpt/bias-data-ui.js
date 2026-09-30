/** Expose the synthetic engagement rows and labeling rules used by each fitted condition. */
import { SCENARIOS, observations, target } from "./bias.js";
const $ = (id) => document.getElementById(id);
/** @returns {any[][]} Return all rows for the selected condition, keeping labels and simulated state distinct. */
function records() {
  const scenario = SCENARIOS.find(
    (s) => s.id === $("bias-data-scenario").value,
  );
  const split = $("bias-data-split").value,
    seed = split === "train" ? 111 : 222;
  return observations(seed).map((r, i) => [
    `${split}-${i + 1}`,
    r.group,
    r.gaze,
    r.posture,
    r.evidence,
    r.y,
    target(r, scenario.id),
    split === "train"
      ? (r.group === "A" ? scenario.share : 1 - scenario.share) / 200
      : 0,
  ]);
}
/** @returns {void} Reveal input values, the teaching label and the separate synthetic criterion side by side. */
function renderData() {
  const scenario = SCENARIOS.find(
      (s) => s.id === $("bias-data-scenario").value,
    ),
    rows = records();
  $("bias-data-note").textContent =
    `400 ${$("bias-data-split").value === "train" ? "training" : "held-out"} rows. Model inputs: ${scenario.features.join(", ")}. Label: ${scenario.target}. ${rows.filter((r) => r[5] !== r[6]).length} labels disagree with the assumed state. All signals are shown for inspection, even when not used as inputs. Display rounded to three decimals; CSV retains full precision.`;
  $("bias-data-rows").replaceChildren(
    ...rows.map((r) => {
      const row = document.createElement("tr");
      for (const [i, value] of r.entries()) {
        const cell = document.createElement("td");
        cell.textContent =
          i >= 2 && i <= 4
            ? value.toFixed(3)
            : i === 7
              ? `${(value * 100).toFixed(3)}%`
              : String(value);
        if ((i === 5 || i === 6) && r[5] !== r[6])
          cell.className = "label-mismatch";
        row.append(cell);
      }
      return row;
    }),
  );
}
/** @returns {void} Download full-precision synthetic rows for the selected condition and split. */
function downloadRows() {
  const csv =
    "id,context,gaze,posture,evidence,assumed_state,training_rule_label,training_weight\n" +
    records()
      .map((r) => r.join(","))
      .join("\n");
  const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `engagement-${$("bias-data-scenario").value}-${$("bias-data-split").value}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const s of SCENARIOS)
  $("bias-data-scenario").append(new Option(s.name, s.id));
for (const id of ["bias-data-scenario", "bias-data-split"])
  $(id).addEventListener("change", renderData);
$("download-bias-data").addEventListener("click", downloadRows);
renderData();
