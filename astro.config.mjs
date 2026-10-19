// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Deployed to https://capabilitymatters.org via the gh-pages workflow. `site` + `base`
// keep canonical URLs and sitemap entries rooted at the custom domain.
export default defineConfig({
  site: "https://capabilitymatters.org",
  base: "/",
  redirects: { "/prototypes": "/problems-to-prototypes/?workingPrototype=true" },
  integrations: [mdx(), {
    name: "required-resource-guidance",
    hooks: {
      // Check the actual output, including standalone HTML and newly added routes.
      "astro:build:done": ({dir}) => {
        execFileSync("python3", [fileURLToPath(new URL("./scripts/check-resource-guidance.py", import.meta.url)),
          "--root", fileURLToPath(dir)], {stdio: "inherit"});
      },
    },
  }],
});
