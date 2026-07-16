// Content collection schema.
//
// One collection: field-notes — short editorial practitioner posts (our voice).
// The broader learning-engineering corpus (practice, tools, reading list, events,
// community) lives at lecommons.org and is linked to, not duplicated, here.

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

export const collections = {
  "field-notes": defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/content/field-notes" }),
    schema: fieldNoteSchema,
  }),
};
