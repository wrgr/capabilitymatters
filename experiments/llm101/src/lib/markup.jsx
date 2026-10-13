/** Preserve the migrated LLM101 markup content and behavior. */
import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import glossary from '../data/glossary.js';

/**
 * Parse a text string into raw segments.
 * Returns an array of segment objects:
 *   { type: 'text', value: string }
 *   { type: 'glossary', key: string, display: string|null }
 */
export function parseMarkup(text) {
  const segments = [];
  const glossaryPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = glossaryPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const key = match[1].trim();
    const display = match[2] ? match[2].trim() : null;
    segments.push({ type: 'glossary', key, display });
    lastIndex = glossaryPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Parse a text segment into math and plain-text sub-segments.
 * Display math ($$...$$) takes priority over inline math ($...$).
 * Returns an array of:
 *   { type: 'plain', value: string }
 *   { type: 'display-math', latex: string }
 *   { type: 'inline-math', latex: string }
 */
function parseMath(text) {
  const parts = [];
  // Match display math first ($$...$$), then inline math ($...$)
  const mathPattern = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = mathPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'plain', value: text.slice(lastIndex, match.index) });
    }
    const raw = match[1];
    if (raw.startsWith('$$')) {
      parts.push({ type: 'display-math', latex: raw.slice(2, -2) });
    } else {
      parts.push({ type: 'inline-math', latex: raw.slice(1, -1) });
    }
    lastIndex = mathPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'plain', value: text.slice(lastIndex) });
  }

  return parts;
}

/**
 * Render math and plain-text sub-segments into React elements.
 */
function renderTextSegment(text, keyPrefix) {
  const parts = parseMath(text);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-math-${i}`;
    if (part.type === 'display-math') {
      const html = katex.renderToString(part.latex, { throwOnError: false, displayMode: true });
      return (
        <div
          key={key}
          className="math-display"
          tabIndex={0}
          role="region"
          aria-label="Mathematical expression"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    if (part.type === 'inline-math') {
      const html = katex.renderToString(part.latex, { throwOnError: false, displayMode: false });
      return (
        <span
          key={key}
          className="math-inline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    // plain text — return as-is (string nodes are valid React children but
    // we wrap in a fragment keyed element to satisfy array requirements)
    return <React.Fragment key={key}>{part.value}</React.Fragment>;
  });
}

/**
 * Parse beat body text and render it as an array of React elements.
 *
 * @param {string} text - The markup string to render.
 * @param {function} onTermClick - Called with (key) when a glossary term is clicked.
 * @returns {React.ReactElement[]}
 */
export function renderMarkup(text, onTermClick) {
  if (!text) return [];

  const segments = parseMarkup(text);
  const elements = [];

  segments.forEach((segment, segIndex) => {
    if (segment.type === 'glossary') {
      const { key, display } = segment;
      const term = glossary[key];
      const label = display ?? (term ? term.name ?? key : key);
      const isMissing = !term;
      elements.push(
        <button type="button"
          key={`gloss-${segIndex}`}
          className={isMissing ? 'glossary-term missing-term' : 'glossary-term'}
          onClick={(event) => onTermClick?.(key, event)}
        >
          {label}
        </button>
      );
    } else {
      // text segment — parse for math
      const mathElements = renderTextSegment(segment.value, `text-${segIndex}`);
      elements.push(...mathElements);
    }
  });

  return elements;
}
