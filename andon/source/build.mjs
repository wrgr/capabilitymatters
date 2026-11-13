/** Build the standalone experiment with its React runtime so visitors need no CDN. */
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
await build({
  entryPoints:[root+'main.tsx'],
  outfile:root+'../app.js',
  bundle:true,
  minify:true,
  format:'esm',
  target:'es2022',
  jsx:'automatic',
  define:{'process.env.NODE_ENV':'"production"'},
  legalComments:'linked',
  banner:{js:'/* Generated standalone React simulation; editable source is in ./source/. */'},
});
