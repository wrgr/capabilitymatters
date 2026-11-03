/** Guard evidence identity, visibility and unavailable execution without claiming model results. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { canonical, emptyEvidence, inspectCheck, loadFrozen, observeScenario, sha256, validateScenario, writeEvidence } from "../scripts/test-dynamic-flower.mjs";

const catalog = JSON.parse(await fs.readFile(new URL("../src/data/lifecycle/dynamic-flower.json", import.meta.url)));

/** Build a temporary pinned artifact; this is a test fixture, never research evidence. @returns {Promise<object>} */
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flower-observer-"));
  const html = '<!doctype html><title>Fixture</title><main>Scripted test fixture</main>';
  const scenarios = [structuredClone(catalog.scenarios[0])];
  const frozen = { schema_version: "dynamic-flower-frozen-1", run_id: "fixture", artifact_version: 1,
    artifact_file: "artifacts/v001.html", artifact_sha256: sha256(html), scenarios,
    scenario_hashes: Object.fromEntries(scenarios.map(s => [s.id, sha256(canonical(s))])), evidence_kind: "fixture" };
  await fs.mkdir(path.join(root, "artifacts"));
  await fs.mkdir(path.join(root, "frozen"));
  await fs.writeFile(path.join(root, frozen.artifact_file), html);
  const target = path.join(root, "frozen/v001.json");
  await fs.writeFile(target, JSON.stringify(frozen));
  return { root, target, frozen, html, scenario: scenarios[0] };
}

test("all six copied scenarios have bound checks and portable identity", () => {
  for (const scenario of catalog.scenarios) validateScenario(scenario);
  const changed = structuredClone(catalog.scenarios[0]);
  changed.actions[0].value.facts.push("New declared test fact");
  assert.notEqual(sha256(canonical(changed)), sha256(canonical(catalog.scenarios[0])));
  assert.throws(() => canonical({ score: 1.5 }), /safe integers/);
});

test("unsafe output IDs and checks with absent action boundaries are rejected", () => {
  const scenario = structuredClone(catalog.scenarios[0]);
  scenario.id = "../outside";
  assert.throws(() => validateScenario(scenario), /Safe scenario ID/);
  scenario.id = "safe";
  scenario.checks[0].after_action = "undeclared";
  assert.throws(() => validateScenario(scenario), /unbound/);
});

test("frozen inputs bind both exact artifact bytes and copied scenario facts", async t => {
  const sample = await fixture();
  t.after(() => fs.rm(sample.root, { recursive: true, force: true }));
  assert.equal((await loadFrozen(sample.target)).html, sample.html);
  await fs.appendFile(path.join(sample.root, sample.frozen.artifact_file), "changed");
  await assert.rejects(loadFrozen(sample.target), /artifact bytes/);
  await fs.writeFile(path.join(sample.root, sample.frozen.artifact_file), sample.html);
  sample.frozen.scenarios[0].task.facts.push("Changed after freeze");
  await fs.writeFile(sample.target, JSON.stringify(sample.frozen));
  await assert.rejects(loadFrozen(sample.target), /Scenario hash mismatch/);
});

test("hidden feedback and hidden editable controls cannot pass visible behavior checks", async () => {
  const page = { locator: () => ({ count: async () => 1, isVisible: async () => false,
    innerText: async () => "Hidden feedback", isEditable: async () => true }) };
  for (const type of ["nonempty", "editable", "text_contains"]) {
    assert.equal((await inspectCheck(page, { selector: "#feedback", type, expected: "feedback" })).status, "fail");
  }
});

test("missing browser context preserves complete unavailable coverage and fixture provenance", async t => {
  const sample = await fixture();
  t.after(() => fs.rm(sample.root, { recursive: true, force: true }));
  const loaded = await loadFrozen(sample.target);
  const empty = emptyEvidence(loaded, sample.scenario);
  assert.equal(empty.evidence_kind, "fixture");
  assert.equal(empty.status, "unavailable");
  assert.ok(empty.actions.every(a => a.status === "unavailable"));
  assert.ok(empty.checks.every(c => c.status === "unavailable" && c.observed === null));
  const result = await observeScenario({ newContext: async () => { throw new Error("Test browser unavailable"); } }, loaded, sample.scenario);
  assert.equal(result.status, "failed");
  assert.ok(result.checks.every(c => c.status === "unavailable"));
  assert.match(result.limitations.at(-1), /Test browser unavailable/);
});

test("evidence files are append-only and cannot escape their output directory", async t => {
  const sample = await fixture();
  t.after(() => fs.rm(sample.root, { recursive: true, force: true }));
  const evidence = emptyEvidence(await loadFrozen(sample.target), sample.scenario);
  const output = path.join(sample.root, "observations");
  await writeEvidence(output, evidence);
  await assert.rejects(writeEvidence(output, evidence), /EEXIST/);
  await assert.rejects(writeEvidence(output, { ...evidence, scenario_id: "../outside" }), /Unsafe/);
});
