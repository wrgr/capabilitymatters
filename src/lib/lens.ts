// Shared helpers for the LENS five-competency framework (v2.1 numbering).
// Used by the LensBar figure and the AskAI prompt so the competency names and
// anchor parsing stay defined in exactly one place.

/** The canonical LENS five competency domains, in order (index 0 = domain 1). */
export const LENS_DOMAINS = [
  "Systems Analysis",
  "Iterative Development",
  "Human-System Collaboration",
  "Test & Evaluation",
  "Sociotechnical Constraints",
] as const;

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
