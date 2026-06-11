import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';

const ENV_SUPABASE_URL = process.env.SUPABASE_URL || 'https://silgimyukbflpayzpwic.supabase.co';
const ENV_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_fjJV0YgwMkYKcH0e0bmnGg_YQNbBuvw';

const defineEnv = {
  SUPABASE_URL: JSON.stringify(ENV_SUPABASE_URL),
  SUPABASE_ANON_KEY: JSON.stringify(ENV_SUPABASE_ANON_KEY),
};

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
      define: defineEnv,
    }),
    build({
      entryPoints: ['src/background/index.ts'],
      bundle: true,
      outfile: `${DIST}/background.js`,
      format: 'esm',
      target: 'chrome120',
      minify: true,
      define: defineEnv,
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