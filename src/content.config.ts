// Content collection schemas.
//
// Two collections:
//   field-notes  — short editorial practitioner posts (our voice).
//   case-studies — LENS case studies drawn from the "Capability Matters"
//                  casebook: one iconic failure + one iconic success per
//                  topical part, showing LENS as an extension of learning
//                  engineering and the kind of work the program does.
//
// The broader learning-engineering corpus (practice, tools, reading list,
// events, community) lives at lecommons.org and is linked to, not duplicated.

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const fieldNoteSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

// Case-study frontmatter mirrors the casebook's per-case salient fields so the
// site render stays faithful to the book: the structured anchors, the "In
// brief" abstract, the five-beat spine, and the Learning-Engineering-Lens
// pair. `lead` is the site's own framing voice (not book-derived); `coi` and
// `evidenceFlag` carry disclosures verbatim and must never be dropped.
const caseStudySchema = z.object({
  title: z.string(),
  // Topical part (I–VII) and its ordinal, for grouping on the index.
  part: z.string(),
  partNumber: z.number().int().min(1).max(7),
  // Failure vs. success framing; drives the badge and pairing on the index.
  outcome: z.enum(["fail", "success"]),
  // Casebook `kind`: "failure" | "intervention" | "frontier".
  kind: z.enum(["failure", "intervention", "frontier"]),
  year: z.string(),
  domains: z.array(z.string()).default([]),
  // One-line consequence line (casebook `impact`).
  impact: z.string(),
  // ~100–150 word "In brief" abstract (casebook `summary`).
  summary: z.string(),
  // Five ~11-word beats — the skimmable spine (casebook `beats`).
  beats: z.array(z.string()).default([]),
  // The Learning Engineering Lens pair (casebook `le-insight` / `lens-approach`).
  leInsight: z.string(),
  lensApproach: z.string(),
  // Three anchors. `lensAnchor` like "D3/PT3" or dual "D1+D5/PT4"; the LensBar
  // component parses the D-number(s) to fill the competency segments.
  lensAnchor: z.string(),
  inducedAnchor: z.string().optional(),
  cloAnchor: z.string().optional(),
  // Disclosures — carried verbatim from the book; rendered prominently.
  coi: z.string().optional(),
  evidenceFlag: z.string().optional(),
  // Provenance + ordering.
  sourceCase: z.number().int(),
  order: z.number().int(),
  // Site-voice lead paragraph (authored here, not derived from the book).
  lead: z.string(),
  draft: z.boolean().default(false),
});

export const collections = {
  "field-notes": defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/content/field-notes" }),
    schema: fieldNoteSchema,
  }),
  "case-studies": defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/content/case-studies" }),
    schema: caseStudySchema,
  }),
};
