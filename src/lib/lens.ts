import framework from '../data/lifecycle/competencies.json';
// Shared helpers for the LENS five-competency framework (v2.1 numbering).
// Used by the LensBar figure and the AskAI prompt so the competency names and
// anchor parsing stay defined in exactly one place.

/** The canonical LENS five competency domains, in order (index 0 = domain 1). */
export const LENS_DOMAINS = framework.domains.map(domain => domain.name);

/** What the historical record supports and how the case can be taught. */
export const CASE_ROLES = {
  intervention: {
    label: "Documented learning engineering",
    description: "People designed or evaluated a way to develop capability. Inspect what the evidence measures and how far it transfers.",
  },
  "possible-response": {
    label: "Potential learning engineering response",
    description: "The record identifies a capability gap that learning engineering could directly address. The proposed response still needs testing.",
  },
  "capability-design": {
    label: "Capability design",
    description: "A tool, role, or rule changed the conditions for performance. The evidence does not by itself establish learning.",
  },
  diagnosis: {
    label: "Failure diagnosis",
    description: "The case supports an inquiry into what people and systems could do. Compare explanations before choosing a response.",
  },
  comparison: {
    label: "Context and comparison",
    description: "The case informs a design decision; evidence about the development or evaluation of a human capability is limited.",
  },
} as const;

export type CaseRole = keyof typeof CASE_ROLES;

/** Extract the 1-based domain numbers from an anchor's "D#" tokens (e.g. "D1+D5/PT4"). */
export function parseLensDomains(anchor: string): number[] {
  const matches = anchor.match(/D(\d)/g) ?? [];
  return matches.map((m) => Number(m.slice(1))).filter((n) => n >= 1 && n <= 5);
}

/** The primary competency name for an anchor, or undefined if it names none. */
export function primaryCompetency(anchor: string): string | undefined {
  const primary = parseLensDomains(anchor)[0];
  return primary ? LENS_DOMAINS[primary - 1] : undefined;
}
