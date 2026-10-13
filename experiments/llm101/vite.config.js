/** Build the maintained explorer into the same-origin public directory before Astro packages the site. */
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/llm101/explorer/',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('../../public/llm101/explorer', import.meta.url)),
    emptyOutDir: true,
  },
});
