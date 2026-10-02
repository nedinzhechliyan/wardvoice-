/**
 * scripts/build-lambda.mjs
 *
 * Builds the WardVoice app for AWS Lambda deployment:
 *  1. Runs `vite build` to produce dist/ (frontend static files)
 *  2. Bundles server.ts with esbuild JS API into lambda-bundle/server.cjs
 *  3. Writes lambda-bundle/index.cjs (the Lambda handler)
 *  4. Copies dist/ into lambda-bundle/dist/
 *  5. Writes a minimal package.json for the bundle
 *  6. npm install inside bundle (only @codegenie/serverless-express)
 *  7. Zips lambda-bundle/ → wardvoice-lambda.zip
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');
const bundleDir = path.join(root, 'lambda-bundle');

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

// ── Step 1: Vite frontend build ───────────────────────────────────────────────
console.log('\n=== Step 1: Vite build (frontend) ===');
run('npx vite build');

// ── Step 2: Clean + recreate bundle dir ──────────────────────────────────────
fs.rmSync(bundleDir, { recursive: true, force: true });
fs.mkdirSync(bundleDir, { recursive: true });

// ── Step 3: esbuild via JS API (avoids Windows shell quoting issues) ──────────
console.log('\n=== Step 2: esbuild server.ts → lambda-bundle/server.cjs ===');
await build({
  entryPoints: [path.join(root, 'server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(bundleDir, 'server.cjs'),
  // Dev-only — not needed in production Lambda
  external: [
    'vite',
    '@vitejs/plugin-react',
    '@tailwindcss/vite',
    'tailwindcss',
    'tsx',
  ],
  banner: { js: '// WardVoice Lambda bundle — auto-generated, do not edit' },
  logLevel: 'info',
});
console.log('✅ Server bundled.');

// ── Step 4: Write Lambda handler ──────────────────────────────────────────────
console.log('\n=== Step 3: Writing Lambda handler (index.cjs) ===');
const handlerCode = `'use strict';
const serverlessExpress = require('@codegenie/serverless-express');
// server.cjs exposes the Express app via module.exports.app
const serverModule = require('./server.cjs');
const expressApp = serverModule.app || serverModule.default || serverModule;
exports.handler = serverlessExpress({ app: expressApp });
`;
fs.writeFileSync(path.join(bundleDir, 'index.cjs'), handlerCode);
console.log('✅ Handler written.');

// ── Step 5: Copy dist/ into bundle ───────────────────────────────────────────
console.log('\n=== Step 4: Copying dist/ into lambda-bundle/ ===');
fs.cpSync(path.join(root, 'dist'), path.join(bundleDir, 'dist'), { recursive: true });
console.log('✅ dist/ copied.');

// ── Step 6: Bundle package.json + npm install ─────────────────────────────────
console.log('\n=== Step 5: Installing lambda-bundle dependencies ===');
const pkgJson = {
  name: 'wardvoice-lambda',
  version: '1.0.0',
  private: true,
  dependencies: {
    '@codegenie/serverless-express': '^4.3.5',
  },
};
fs.writeFileSync(
  path.join(bundleDir, 'package.json'),
  JSON.stringify(pkgJson, null, 2),
);
run('npm install --omit=dev --legacy-peer-deps', { cwd: bundleDir });

// ── Step 7: Zip ───────────────────────────────────────────────────────────────
console.log('\n=== Step 6: Zipping lambda-bundle/ → wardvoice-lambda.zip ===');
const zipPath = path.join(root, 'wardvoice-lambda.zip');
fs.rmSync(zipPath, { force: true });

if (process.platform === 'win32') {
  // PowerShell Compress-Archive
  execSync(
    `powershell -Command "Compress-Archive -Path '${bundleDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' },
  );
} else {
  execSync(`zip -r "${zipPath}" .`, { stdio: 'inherit', cwd: bundleDir });
}

const sizeKb = Math.round(fs.statSync(zipPath).size / 1024);
console.log(`\n✅ Done!  wardvoice-lambda.zip — ${sizeKb} KB`);
console.log('Next: run  npm run deploy:aws  to push to AWS.\n');
