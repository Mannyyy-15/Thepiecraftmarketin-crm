#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, cpSync, readdirSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(import.meta.dirname, '.');
const CAP_WEB_DIR = join(ROOT, 'capacitor-app');
const NEXT_OUT = join(ROOT, 'out');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

async function main() {
  const mode = process.argv[2] || 'server';

  if (mode === 'export') {
    // Static export mode (limited — no server actions)
    console.log('Building Next.js for static export...');
    run('npx next build');
    if (!existsSync(NEXT_OUT)) {
      throw new Error('Static export failed — "out" directory not found.');
    }
    // Copy to capacitor web dir
    if (existsSync(CAP_WEB_DIR)) {
      cpSync(CAP_WEB_DIR, join(NEXT_OUT, 'capacitor-app'), { recursive: true, force: true });
    }
    console.log('Static export complete. Files are in "out/"');
  } else {
    // Server mode: build Next.js to .next, sync capacitor
    console.log('Building Next.js (server mode)...');
    run('npx next build');
    console.log('\nSyncing Capacitor...');
    run('npx cap sync');
    console.log('\nCapacitor web assets synced.');
  }

  console.log('\nDone! You can now open the native IDE:');
  console.log('  npm run cap:open:android');
  console.log('  npm run cap:open:ios');
  console.log('\nOr build directly:');
  console.log('  npm run cap:build:android');
  console.log('  npm run cap:build:ios');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
