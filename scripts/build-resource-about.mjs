/** Package script-free guidance into standalone hosts after their canonical generators run. */
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {renderResourceAbout} from '../src/lib/resource-about.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Explicit boundaries fail closed when a host changes; never rewrite candidate artifacts or journals.
export const staticResources = [
  ['capability-pipeline/index.html', 'pipeline', '</h1>'],
  ['capability-pipeline/cases.html', 'pipeline-cases', '</h1>'],
  ['capability-pipeline/simulation.html', 'pipeline-simulation', '</h1>'],
  ['rainbow-bug/index.html', 'rainbow-bug', '</h1>'],
  ['agentic-le/replay/index.html', 'agentic-replay', '</h1>'],
  ...[
    ['product', 'workforce-original'],
    ['cases/workforce-conversation', 'workforce-conversation'],
    ['cases/school-science', 'school-science'],
    ['cases/school-investigation', 'school-investigation'],
    ['cases/library-access', 'library-access'],
    ['cases/library-journey', 'library-journey'],
  ].map(([path, key]) => [`agentic-le/${path}/index.html`, `candidate-${key}`, '</h1>']),
  ['andon/research-brief.html', 'andon-research', '</h1>'],
];

/** @param {string} html @param {string} key @param {string} boundary @returns {string} Insert one native disclosure at its reviewed introduction boundary. */
export function insertResourceAbout(html, key, boundary) {
  const clean = html.replace(/<!-- resource-about:start -->[\s\S]*?<!-- resource-about:end -->\n?/g, '');
  if (clean.split(boundary).length !== 2) throw new Error(`Expected one resource introduction boundary: ${key}`);
  const card = `<!-- resource-about:start -->${renderResourceAbout(key)}<!-- resource-about:end -->\n`;
  let result = clean.replace(boundary, boundary === '</h1>' ? boundary + card : card + boundary);
  if (!result.includes('href="/resource-about.css"')) {
    // The original research brief omits optional head/body tags; its style end is a valid head boundary.
    const headEnd = result.includes('</head>') ? '</head>' : '</style>';
    result = result.replace(headEnd, headEnd === '</head>' ? '<link rel="stylesheet" href="/resource-about.css"></head>' : '</style><link rel="stylesheet" href="/resource-about.css">');
  }
  return result;
}

/** @returns {Promise<void>} Build the standalone cards using the same renderer as Astro and React. */
async function build() {
  for (const [file, key, boundary] of staticResources) {
    const path = resolve(root, 'public', file);
    await writeFile(path, insertResourceAbout(await readFile(path, 'utf8'), key, boundary));
  }
  console.log(`Packaged About this resource on ${staticResources.length} standalone pages.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
