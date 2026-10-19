/** Publish the shared cycle illustration into the standalone worked-case page. */
import {readFileSync, writeFileSync} from 'node:fs';

const diagram = readFileSync(new URL('../src/assets/capability-cycle.svg', import.meta.url), 'utf8').trim();
const target = new URL('../public/capability-pipeline/cases.html', import.meta.url);
const page = readFileSync(target, 'utf8');
const boundary = /<!-- capability-cycle:start -->[\s\S]*?<!-- capability-cycle:end -->/g;
if ([...page.matchAll(boundary)].length !== 1) throw new Error('Expected one shared capability-cycle boundary.');
const updated = page.replace(boundary, () => `<!-- capability-cycle:start -->${diagram}<!-- capability-cycle:end -->`);
if (updated !== page) writeFileSync(target, updated);
