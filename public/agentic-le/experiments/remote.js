/** Isolate runner requests so hosted configuration and imported replay remain usable without execution. */

/** @param {string} path @param {object} [body] @returns {Promise<object>} Request JSON and surface explicit backend failures. */
export async function fetchJSON(path, body) {
  const options = body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {};
  const response = await fetch(path, {...options, cache: 'no-store'});
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The local experiment service is not available at this address.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

/** @returns {Promise<object>} Prefer the local catalog and report an explicit static fallback. */
export async function loadWorkspace() {
  try {
    const [data, connection] = await Promise.all([fetchJSON('/api/experiments/catalog'), fetchJSON('/api/status')]);
    return {...data, connection};
  } catch (error) {
    const [catalog, config] = await Promise.all([fetchJSON('./catalog.json'), fetchJSON('./default.json')]);
    return {catalog, default_config: config, connection: {local_runner: false, unavailable_reason: error.message}};
  }
}

/** @param {object} batch @returns {boolean} Recognize batch completion without assuming every run succeeded. */
export function batchFinished(batch) {
  return ['completed', 'failed', 'completed_with_failures', 'cancelled'].includes(batch.status);
}
