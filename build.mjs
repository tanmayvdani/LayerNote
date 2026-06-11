import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';
const RELEASE_DIR = 'release';
const RELEASE_PACKAGE = 'release/layernote';
const ZIP_OUT = 'layernote.zip';

const ENV_SUPABASE_URL = process.env.SUPABASE_URL || 'https://silgimyukbflpayzpwic.supabase.co';
const ENV_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_fjJV0YgwMkYKcH0e0bmnGg_YQNbBuvw';

const defineEnv = {
  SUPABASE_URL: JSON.stringify(ENV_SUPABASE_URL),
  SUPABASE_ANON_KEY: JSON.stringify(ENV_SUPABASE_ANON_KEY),
};

if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });
else rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

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

  if (existsSync(RELEASE_PACKAGE)) {
    rmSync(RELEASE_PACKAGE, { recursive: true, force: true });
  }
  mkdirSync(RELEASE_PACKAGE, { recursive: true });
  cpSync(DIST, RELEASE_PACKAGE, { recursive: true });

  if (!existsSync(RELEASE_DIR)) mkdirSync(RELEASE_DIR, { recursive: true });
  console.log('Build complete. Release ready at release/layernote/');
  console.log('Run: cd release && npx bestzip ../layernote.zip layernote');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

