/** Render the same script-free resource disclosure in Astro, React, and standalone pages. */
import resources from '../data/resource-about.json' with {type: 'json'};

/** @typedef {{what: string, how: string[], connection: string, links?: {label: string, href: string}[]}} ResourceAbout */

/** @param {string} value @returns {string} Escape authored text before inserting it in HTML. */
function escape(value) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}

/** @param {string} key @param {ResourceAbout} [content] @param {2|3} [headingLevel] @returns {string} Fail on missing guidance instead of silently publishing incomplete cards. */
export function renderResourceAbout(key, content = resources[key], headingLevel = 2) {
  if (![2, 3].includes(headingLevel)) throw new Error(`Invalid resource heading level: ${key}`);
  if (!content?.what?.trim() || !content.connection?.trim() || !content.how?.length || content.how.some(step => !step.trim())) {
    throw new Error(`Incomplete About this resource content: ${key}`);
  }
  const links = [...(content.links || []), {label: 'LENS: capabilities and conditions', href: '/show-your-work/'}, {label: 'Learning Engineering Commons', href: 'https://lecommons.org/'}];
  for (const {href, label} of links) {
    if (!label.trim() || !/^(\/(?!\/)|https:\/\/)/.test(href)) throw new Error(`Invalid resource link: ${key}`);
  }
  return `<details class="resource-about" data-resource-about="${escape(key)}">
<summary>About this resource<span class="resource-about-hint"> · How to use it · Learning engineering connections</span></summary>
<div class="resource-about-body">
<section><h${headingLevel}>What is this resource?</h${headingLevel}><p>${escape(content.what)}</p></section>
<section><h${headingLevel}>How should I use it?</h${headingLevel}><ol>${content.how.map(step => `<li>${escape(step)}</li>`).join('')}</ol></section>
<section><h${headingLevel}>How does this connect to LENS and learning engineering?</h${headingLevel}><p>${escape(content.connection)}</p><ul class="resource-about-links">${links.map(({href, label}) => `<li><a href="${escape(href)}">${escape(label)}</a></li>`).join('')}</ul></section>
</div></details>`;
}
