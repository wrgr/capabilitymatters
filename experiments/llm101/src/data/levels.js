/** Preserve the migrated LLM101 levels content and behavior. */
export const LEVELS = [
  { id: 'picture', name: 'The Picture', description: 'A single mental image', audience: 'Anyone' },
  { id: 'overview', name: 'Overview', description: 'How the pieces connect', audience: 'No background needed' },
  { id: 'reasoning', name: 'Core reasoning', description: 'Why it works', audience: 'General public' },
  { id: 'hood', name: 'Under the hood', description: 'The actual mechanism', audience: 'STEM background' },
  { id: 'formal', name: 'Formal', description: 'Notation and derivations', audience: 'Grad / researcher' },
];

export const ROLES = [
  'hook',
  'explain',
  'example',
  'misconception',
  'stakes',
  'formalism',
  'check',
];

export const ARCS = [
  { id: 'mechanistic', label: 'How it works', range: [0, 8] },
  { id: 'meaning', label: 'What it means', range: [9, 14] },
];
