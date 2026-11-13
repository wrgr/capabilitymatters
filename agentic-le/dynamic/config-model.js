/** Resolve and validate editable conversation inputs before exporting them to the local runner. */
export const VERSION = 'dynamic-flower-1';
export const PHASES = [['design_develop', 'Design / Develop'], ['deploy_test', 'Deploy / Test']];
const kinds = ['specialist', 'generalist', 'facilitator', 'evaluator'];
const capabilities = {specialist: ['implement'], generalist: ['implement'], facilitator: ['facilitate'], evaluator: ['evaluate']};
const require = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = (value, label) => require(typeof value === 'string' && value.trim() && value.length <= 100000, `${label} needs nonempty text (at most 100,000 characters).`);
const identifier = (value, label) => require(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(value), `${label} must be a short identifier using letters, numbers, dots, underscores or hyphens.`);
const strings = (values, label) => { require(Array.isArray(values), `${label} must be a list.`); values.forEach(value => nonempty(value, label)); };
const selector = value => require(typeof value === 'string' && /^#[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value), 'Scenario selectors must be simple declared control IDs.');

function indexed(items, label) {
  require(Array.isArray(items), `${label} must be a list.`);
  const result = new Map();
  for (const item of items) {
    require(item && typeof item === 'object' && !Array.isArray(item), `${label} contains an invalid object.`);
    identifier(item.id, label); require(!result.has(item.id), `${label} repeats ${item.id}.`); result.set(item.id, item);
  }
  return result;
}

function validateWire(value) {
  if (typeof value === 'number') require(Number.isSafeInteger(value), 'Configuration numeric values must be safe integers.');
  if (Array.isArray(value)) value.forEach(validateWire);
  else if (value && typeof value === 'object') Object.values(value).forEach(validateWire);
}

/** @param {object} catalog @param {string} caseId @param {string} conditionId @returns {object} Copy the exact catalog inputs into an editable runner configuration. */
export function makeConfig(catalog, caseId, conditionId) {
  const selectedCase = catalog.cases.find(item => item.id === caseId);
  const condition = catalog.conditions.find(item => item.id === conditionId);
  require(selectedCase && condition, 'Choose an available case and condition.');
  const refs = [...new Set([...condition.agent_ids, condition.facilitator_id, condition.evaluator_id])];
  const agents = refs.map(id => structuredClone(catalog.agents.find(agent => agent.id === id)));
  for (const agent of agents) {
    if (condition.domain_overrides?.[agent.id]) agent.domains = structuredClone(condition.domain_overrides[agent.id]);
    if (condition.brief_overrides?.[agent.id]) agent.brief = condition.brief_overrides[agent.id];
    if (agent.kind === 'specialist' && !agent.domains.length) {
      agent.brief = 'No specialist expertise is assigned in this condition. Ask an assigned colleague for substantive expertise; retain uncertainty and do not issue specialist signoff.';
    }
  }
  const scenarios = structuredClone(catalog.scenarios.filter(item => item.case_id === caseId));
  const config = {schema_version: VERSION, id: `${caseId}-${conditionId}-v1`, case_id: caseId, condition_id: conditionId,
    case: structuredClone(selectedCase), agents, facilitator_id: condition.facilitator_id, evaluator_id: condition.evaluator_id,
    scenario_ids: scenarios.map(item => item.id), scenarios,
    budgets: {design_develop: 24, deploy_test: 12, max_context_chars: 600000}, updates: []};
  return validateConfig(config, catalog);
}

function validateAgent(agent, domains) {
  nonempty(agent.label, 'Agent label'); nonempty(agent.brief, `${agent.label}: knowledge brief`);
  require(kinds.includes(agent.kind), 'Unknown agent kind.');
  strings(agent.domains, 'Assigned domains'); strings(agent.limits, 'Knowledge limits');
  require(new Set(agent.domains).size === agent.domains.length && agent.domains.every(id => domains.has(id)), 'Unknown or repeated expertise domain.');
  require(agent.kind === 'specialist' || agent.domains.length === 0, 'Only specialists receive specialist domains.');
  strings(agent.capabilities ?? [], 'Procedural capabilities');
  require((agent.capabilities ?? []).every(value => capabilities[agent.kind].includes(value)), 'A procedural capability exceeds this agent’s role.');
}

function validateScenario(scenario, caseId) {
  require(scenario.case_id === caseId, 'A selected scenario belongs to a different case.');
  require(['easy', 'medium', 'hard'].includes(scenario.difficulty), 'Scenario difficulty must be easy, medium or hard.');
  nonempty(scenario.title, 'Scenario title'); nonempty(scenario.brief, 'Scenario brief');
  const conditions = scenario.conditions ?? {};
  require(conditions && typeof conditions === 'object' && !Array.isArray(conditions), 'Scenario conditions must be an object.');
  if ('offline' in conditions) require(typeof conditions.offline === 'boolean', 'The offline test condition must be true or false.');
  if ('viewport' in conditions) require(conditions.viewport && ['width', 'height'].every(key => Number.isInteger(conditions.viewport[key]) && conditions.viewport[key] >= 240 && conditions.viewport[key] <= 3840), 'Scenario viewport dimensions must be integers from 240 to 3840.');
  const actions = indexed(scenario.actions, 'Scenario actions'), checks = indexed(scenario.checks, 'Scenario checks');
  require(checks.size > 0, 'A test scenario needs observable checks.');
  for (const action of actions.values()) {
    require(['scenario', 'fill', 'click', 'press'].includes(action.type), 'Unsupported scenario action.');
    selector(action.selector);
    if (action.type === 'fill') require(typeof action.value === 'string', 'A fill action needs a literal string.');
    if (action.type === 'press') require(['Enter', 'Space', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp'].includes(action.key), 'Unsupported scenario key action.');
    if (action.type === 'scenario') {
      selector(action.trigger);
      require(action.value && typeof action.value === 'object' && !Array.isArray(action.value), 'A scenario action needs a data object.');
    }
  }
  for (const check of checks.values()) {
    require(['text_contains', 'nonempty', 'editable', 'value_equals'].includes(check.type), 'Unsupported scenario check.');
    selector(check.selector); require(actions.has(check.after_action), 'A check must identify its exact preceding action.');
    if (['text_contains', 'value_equals'].includes(check.type)) require(typeof check.expected === 'string', 'A check needs its declared text expectation.');
  }
}

function validateBounds(config) {
  for (const [phase] of PHASES) require(Number.isInteger(config.budgets?.[phase]) && config.budgets[phase] >= 1 && config.budgets[phase] <= 200, 'Each phase needs a budget of 1–200 calls.');
  require(Number.isInteger(config.budgets?.max_context_chars) && config.budgets.max_context_chars >= 2000 && config.budgets.max_context_chars <= 2000000, 'The context budget must be 2,000–2,000,000 characters.');
  for (const update of indexed(config.updates ?? [], 'User changes').values()) {
    require(PHASES.some(([id]) => id === update.phase), 'A queued change needs a valid phase.');
    require(Number.isInteger(update.after_turn) && update.after_turn >= 0 && update.after_turn < config.budgets[update.phase], 'A queued change must occur before that phase’s call limit.');
    nonempty(update.message, 'User change');
  }
}

/** @param {object} config @param {object} catalog @returns {object} Refuse invalid exported inputs instead of silently substituting defaults. */
export function validateConfig(config, catalog) {
  validateWire(config);
  require(config?.schema_version === VERSION, 'This is not a dynamic-flower-1 configuration.'); identifier(config.id, 'Configuration ID');
  require(catalog.cases.some(item => item.id === config.case_id), 'Unknown case ID.');
  require(catalog.conditions.some(item => item.id === config.condition_id), 'Unknown condition ID.');
  nonempty(config.case?.title, 'Case title'); nonempty(config.case?.brief, 'Case brief'); strings(config.case?.constraints, 'Case constraints');
  const agents = indexed(config.agents, 'Agents'), domains = new Set(catalog.domains.map(item => item.id));
  for (const agent of agents.values()) validateAgent(agent, domains);
  for (const [key, kind] of [['facilitator_id', 'facilitator'], ['evaluator_id', 'evaluator']]) require(agents.get(config[key])?.kind === kind, `The ${kind} must be a matching agent in this roster.`);
  require([...agents.values()].some(agent => ['specialist', 'generalist'].includes(agent.kind)), 'The configuration needs an authoring agent.');
  require([...agents.values()].some(agent => agent.capabilities?.includes('implement')), 'The configuration needs implementation authority.');
  validateBounds(config);
  const scenarios = indexed(config.scenarios, 'Scenarios'); strings(config.scenario_ids, 'Scenario IDs');
  require(config.scenario_ids.length > 0 && new Set(config.scenario_ids).size === config.scenario_ids.length && config.scenario_ids.length === scenarios.size && config.scenario_ids.every(id => scenarios.has(id)), 'Selected scenario IDs must match their copied definitions exactly.');
  for (const scenario of scenarios.values()) validateScenario(scenario, config.case_id);
  return config;
}

/** @param {string} id @returns {string} Give the next exported configuration a distinct human-readable version identity. */
export function nextVersionId(id) {
  const match = id.match(/^(.*)-v(\d+)$/), version = match ? Number(match[2]) + 1 : 2;
  require(Number.isSafeInteger(version) && version <= 999999, 'Choose a new configuration ID before adding another version.');
  return `${(match ? match[1] : id).slice(0, 92)}-v${version}`;
}

/** @param {string} value @returns {string[]} Turn an editable line list into explicit nonempty entries. */
export const lines = value => value.split('\n').map(line => line.trim()).filter(Boolean);

/** @param {object} config @returns {string} Produce explicit manual runner commands without invoking a provider from the page. */
export function runnerCommands(config) {
  identifier(config.id, 'Configuration ID');
  const tool = 'python3 tools/lifecycle/dynamic_flower.py', run = `runs/${config.id}`;
  return `${tool} create --config ${config.id}.json --output ${run}\n${tool} prompt --run ${run}\n${tool} advance --run ${run} --response response.json\n${tool} inspect --run ${run}`;
}
