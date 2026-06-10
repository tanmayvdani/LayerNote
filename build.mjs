import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';

if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

async function main() {
  await Promise.all([
    build({
      entryPoints: ['src/content/youtube.ts'],
      bundle: true,
      outfile: `${DIST}/content.js`,
      format: 'iife',
      target: 'chrome120',
      minify: true,
    }),
    build({
      entryPoints: ['src/background/index.ts'],
      bundle: true,
      outfile: `${DIST}/background.js`,
      format: 'esm',
      target: 'chrome120',
      minify: true,
    }),
  ]);

  cpSync('manifest.json', join(DIST, 'manifest.json'));

  if (existsSync('icons')) {
    mkdirSync(join(DIST, 'icons'), { recursive: true });
    cpSync('icons', join(DIST, 'icons'), { recursive: true });
  }

  console.log('Build complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});