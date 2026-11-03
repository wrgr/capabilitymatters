/** Observe a frozen learning tool under declared scenario actions without inventing learning outcomes. */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SELF = fileURLToPath(import.meta.url);
const ACTIONS = new Set(["scenario", "fill", "click", "press"]);
const CHECKS = new Set(["text_contains", "nonempty", "editable", "value_equals"]);
const SELECTOR = /^#[A-Za-z][A-Za-z0-9_-]{0,79}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/;
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
const MAX_TEXT = 20000;

/** Return a SHA-256 digest of exact UTF-8 text or bytes. @param {string|Buffer} value @returns {string} */
export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Serialize integer-valued JSON deterministically across the browser and Python runner. @param {unknown} value @returns {string} */
export function canonical(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("Wire numbers must be safe integers");
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Unsupported JSON value");
  return encoded;
}

/** Reject undeclared actions, unsafe selectors and unbound checks before browser execution. @param {object} scenario @returns {void} */
export function validateScenario(scenario) {
  if (typeof scenario.id !== "string" || !ID.test(scenario.id) || !Array.isArray(scenario.actions) || !Array.isArray(scenario.checks)) throw new Error("Safe scenario ID, actions and checks are required");
  const viewport = scenario.conditions?.viewport;
  if (viewport && (![viewport.width, viewport.height].every(Number.isSafeInteger) || viewport.width < 240 || viewport.height < 240 || viewport.width > 3840 || viewport.height > 3840)) throw new Error("Invalid declared viewport");
  const ids = new Set();
  for (const action of scenario.actions) {
    if (typeof action.id !== "string" || !ID.test(action.id) || ids.has(action.id) || !ACTIONS.has(action.type) || !SELECTOR.test(action.selector)) throw new Error("Invalid or duplicate scenario action");
    ids.add(action.id);
    if (action.type === "scenario" && (!SELECTOR.test(action.trigger) || !action.value || typeof action.value !== "object")) throw new Error("Scenario action needs a data object and apply control");
    if (action.type === "fill" && typeof action.value !== "string") throw new Error("Fill action needs text");
    if (action.type === "press" && !["Enter", "Space", "Tab", "Escape", "ArrowDown", "ArrowUp"].includes(action.key)) throw new Error("Unsupported key action");
  }
  const checkIds = new Set();
  for (const check of scenario.checks) {
    if (typeof check.id !== "string" || !ID.test(check.id) || checkIds.has(check.id) || !CHECKS.has(check.type) || !SELECTOR.test(check.selector) || !ids.has(check.after_action)) throw new Error("Invalid, duplicate or unbound scenario check");
    checkIds.add(check.id);
    if (["text_contains", "value_equals"].includes(check.type) && typeof check.expected !== "string") throw new Error("Text comparison requires an explicit expected string");
  }
  canonical(scenario);
}

/** Read and bind one immutable artifact version and its copied scenario definitions. @param {string} frozenPath @returns {Promise<object>} */
export async function loadFrozen(frozenPath) {
  const absolute = path.resolve(frozenPath);
  const bytes = await fs.readFile(absolute);
  const frozen = JSON.parse(bytes.toString("utf8"));
  if (frozen.schema_version !== "dynamic-flower-frozen-1") throw new Error("Unsupported frozen artifact contract");
  const root = path.dirname(path.dirname(absolute));
  const artifactPath = path.resolve(root, frozen.artifact_file);
  if (!artifactPath.startsWith(root + path.sep) || !artifactPath.endsWith(".html")) throw new Error("Artifact must be an HTML file within this run");
  const html = await fs.readFile(artifactPath);
  if (html.length > 2000000 || sha256(html) !== frozen.artifact_sha256) throw new Error("Frozen artifact bytes do not match their declared hash");
  if (!Array.isArray(frozen.scenarios) || !frozen.scenarios.length) throw new Error("Frozen scenario copies are required");
  for (const scenario of frozen.scenarios) {
    validateScenario(scenario);
    if (sha256(canonical(scenario)) !== frozen.scenario_hashes[scenario.id]) throw new Error(`Scenario hash mismatch: ${scenario.id}`);
  }
  return { frozen, root, html: html.toString("utf8"), sourceHashes: { runner: sha256(await fs.readFile(SELF)), frozen_export: sha256(bytes) } };
}

/** Create an explicitly unexecuted observation record with complete declared coverage. @param {object} loaded @param {object} scenario @param {boolean} fixture @returns {object} */
export function emptyEvidence(loaded, scenario, fixture = false) {
  const { frozen, sourceHashes } = loaded;
  return {
    schema_version: "dynamic-flower-observation-1", run_id: frozen.run_id,
    artifact_version: frozen.artifact_version, artifact_sha256: frozen.artifact_sha256,
    scenario_id: scenario.id, scenario_sha256: frozen.scenario_hashes[scenario.id],
    evidence_kind: fixture || frozen.evidence_kind === "fixture" ? "fixture" : "browser_observation",
    status: "unavailable", actions: scenario.actions.map(action => ({ id: action.id, status: "unavailable", observation: { rendered_text: "", reason: "Not executed" } })),
    checks: scenario.checks.map(check => ({ id: check.id, after_action: check.after_action, status: "unavailable", observed: null, expected: check.expected ?? check.type })),
    runtime_errors: [], network_requests: [], limitations: [
      "Scripted browser actions are not observations of human learning, completion time or real-world deployment.",
      "Technical checks do not establish semantic quality. The expert must inspect actual inputs, outputs and scenario facts.",
      "A fresh browser context and restrictive content policy block external resources for every scenario. Offline status additionally follows the declared condition."
    ], source_hashes: { ...sourceHashes }, viewport: scenario.conditions?.viewport ?? { width: 1280, height: 800 },
    offline: scenario.conditions?.offline === true, observed_at: new Date().toISOString(), initial_keyboard_focus: []
  };
}

/** Return a bounded rendered observation with its truncation explicitly recorded. @param {import('playwright').Page} page @returns {Promise<object>} */
async function snapshot(page) {
  const rendered = await page.locator("body").innerText({ timeout: 3000 });
  const value = await page.evaluate(() => {
    const visibleText = selector => {
      const element = document.querySelector(selector);
      return element?.checkVisibility({checkOpacity: true, checkVisibilityCSS: true}) ? element.innerText : "";
    };
    return { feedback: visibleText("#feedback"), practice_status: visibleText("#practice-status"),
      response: document.querySelector("#response-input")?.value ?? null,
      horizontal_overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      active_control: document.activeElement?.id || document.activeElement?.tagName || "" };
  });
  return { rendered_text: rendered.slice(0, MAX_TEXT), original_rendered_chars: rendered.length, rendered_text_truncated: rendered.length > MAX_TEXT, ...value };
}

/** Execute one declared interaction without evaluating arbitrary supplied JavaScript. @param {import('playwright').Page} page @param {object} action @returns {Promise<void>} */
async function perform(page, action) {
  const control = page.locator(action.selector);
  if (action.type === "scenario") {
    await control.fill(JSON.stringify(action.value));
    await page.locator(action.trigger).click();
  } else if (action.type === "fill") await control.fill(action.value);
  else if (action.type === "click") await control.click();
  else if (action.type === "press") await control.press(action.key);
}

/** Observe a technical check at its declared action boundary. @param {import('playwright').Page} page @param {object} check @returns {Promise<object>} */
export async function inspectCheck(page, check) {
  const control = page.locator(check.selector);
  if (await control.count() !== 1) return { status: "fail", observed: "Required control missing or ambiguous" };
  if (!await control.isVisible()) return { status: "fail", observed: "Required control is hidden" };
  if (check.type === "editable") {
    const observed = await control.isEditable();
    return { status: observed ? "pass" : "fail", observed };
  }
  const observed = check.type === "value_equals" ? await control.inputValue() : await control.innerText();
  const passed = check.type === "value_equals" ? observed === check.expected : check.type === "text_contains" ? observed.includes(check.expected) : observed.trim().length > 0;
  return { status: passed ? "pass" : "fail", observed };
}

/** Retain the failed action and keep later independent checks observable. @param {import('playwright').Page} page @param {object} action @param {object} evidence @param {object} scenario @returns {Promise<void>} */
async function observeAction(page, action, evidence, scenario) {
  const record = evidence.actions.find(item => item.id === action.id);
  try {
    await perform(page, action);
    record.observation = await snapshot(page);
    record.status = "observed";
  } catch (error) {
    record.status = "failed";
    record.observation = { rendered_text: "", reason: String(error.message).slice(0, 2000) };
  }
  for (const check of scenario.checks.filter(item => item.after_action === action.id)) {
    const result = evidence.checks.find(item => item.id === check.id);
    if (record.status !== "observed") { result.observed = "Prerequisite action was not observed"; continue; }
    try { Object.assign(result, await inspectCheck(page, check)); }
    catch (error) { result.status = "unavailable"; result.observed = String(error.message).slice(0, 2000); }
  }
}

/** Record focus movement without treating a short Tab trace as a complete accessibility audit. @param {import('playwright').Page} page @returns {Promise<string[]>} */
async function keyboardTrace(page) {
  const focus = [];
  for (let count = 0; count < 12; count += 1) {
    await page.keyboard.press("Tab");
    focus.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || ""));
  }
  return focus;
}

/** Execute a scenario in an isolated browser and preserve observed failures without manufacturing scores. @param {import('playwright').Browser} browser @param {object} loaded @param {object} scenario @param {boolean} fixture @returns {Promise<object>} */
export async function observeScenario(browser, loaded, scenario, fixture = false) {
  const evidence = emptyEvidence(loaded, scenario, fixture);
  const started = Date.now();
  let context;
  try {
    context = await browser.newContext({ viewport: evidence.viewport, acceptDownloads: false, serviceWorkers: "block" });
    await context.setOffline(evidence.offline);
    await context.route("**/*", route => route.abort("blockedbyclient"));
    const page = await context.newPage();
    page.setDefaultTimeout(3000);
    page.on("pageerror", error => evidence.runtime_errors.push(String(error.message)));
    page.on("request", request => evidence.network_requests.push({ url: request.url(), method: request.method(), disposition: "blocked" }));
    await page.setContent(`<meta http-equiv="Content-Security-Policy" content="${CSP}">${loaded.html}`, { waitUntil: "load", timeout: 10000 });
    evidence.initial_keyboard_focus = await keyboardTrace(page);
    evidence.initial_observation = await snapshot(page);
    for (const action of scenario.actions) await observeAction(page, action, evidence, scenario);
    evidence.status = "observed";
    if (evidence.actions.some(item => item.observation.rendered_text_truncated)) evidence.limitations.push("Some rendered observations exceed the capture bound; omitted text cannot support an exact quotation.");
  } catch (error) {
    evidence.status = "failed";
    evidence.limitations.push(`Browser execution did not complete: ${String(error.message).slice(0, 2000)}`);
  } finally { if (context) await context.close(); }
  evidence.elapsed_ms = Date.now() - started;
  return evidence;
}

/** Write only new evidence files so an earlier observed attempt is never silently overwritten. @param {string} output @param {object} evidence @returns {Promise<string>} */
export async function writeEvidence(output, evidence) {
  if (typeof evidence.scenario_id !== "string" || !ID.test(evidence.scenario_id)) throw new Error("Unsafe evidence scenario ID");
  await fs.mkdir(output, { recursive: true });
  const target = path.join(output, `${evidence.scenario_id}.json`);
  await fs.writeFile(target, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  return target;
}

/** Run selected copied scenarios against an explicitly selected frozen artifact version. @param {object} options @returns {Promise<object[]>} */
export async function runDeployment(options) {
  const loaded = await loadFrozen(options.frozen);
  const scenarios = options.scenario ? loaded.frozen.scenarios.filter(item => item.id === options.scenario) : loaded.frozen.scenarios;
  if (!scenarios.length) throw new Error("Scenario is not part of this frozen version");
  const output = path.resolve(options.output ?? path.join(loaded.root, "observations", `v${String(loaded.frozen.artifact_version).padStart(3, "0")}`));
  let browser;
  const results = [];
  try { browser = await chromium.launch({ headless: true, ...(options.executable ? { executablePath: options.executable } : {}) }); }
  catch (error) {
    for (const scenario of scenarios) {
      const evidence = emptyEvidence(loaded, scenario, options.fixture);
      evidence.limitations.push(`Browser unavailable: ${String(error.message).slice(0, 2000)}`);
      results.push({ path: await writeEvidence(output, evidence), status: evidence.status });
    }
    return results;
  }
  try {
    for (const scenario of scenarios) {
      const evidence = await observeScenario(browser, loaded, scenario, options.fixture);
      results.push({ path: await writeEvidence(output, evidence), status: evidence.status, failed_checks: evidence.checks.filter(item => item.status === "fail").length });
    }
  } finally { await browser.close(); }
  return results;
}

/** Parse explicit CLI paths and reject unknown options. @param {string[]} args @returns {object} */
function argumentsFor(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index].replace(/^--/, "");
    if (key === "fixture") { result.fixture = true; continue; }
    if (!["frozen", "scenario", "output", "executable"].includes(key) || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error("Use --frozen FILE [--scenario ID] [--output DIR] [--executable PATH] [--fixture]");
    result[key] = args[++index];
  }
  if (!result.frozen) throw new Error("An explicit --frozen FILE is required");
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  try {
    const results = await runDeployment(argumentsFor(process.argv.slice(2)));
    console.log(JSON.stringify({ results }, null, 2));
    if (results.some(result => result.status !== "observed")) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
