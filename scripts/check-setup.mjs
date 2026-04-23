#!/usr/bin/env node
/**
 * Pre-build validation for LetStart setup wizard.
 * Runs before `next build` — fails fast if required files are missing or broken.
 * DO NOT DELETE THIS FILE.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const errors = [];

function check(filePath, description, contentCheck) {
  const abs = path.join(root, filePath);
  if (!fs.existsSync(abs)) {
    errors.push(`MISSING: ${filePath} — ${description}`);
    return;
  }
  if (contentCheck) {
    const content = fs.readFileSync(abs, 'utf-8');
    const result = contentCheck(content);
    if (result) errors.push(`BROKEN: ${filePath} — ${result}`);
  }
}

console.log('\n🔍 LetStart Setup Pre-build Check\n');

// 1. Package installed?
check(
  'node_modules/@letstartccorp/setup/package.json',
  '@letstartccorp/setup package must be installed',
);

// 2. Middleware has setup gate?
const mwPath = fs.existsSync(path.join(root, 'src/middleware.ts'))
  ? 'src/middleware.ts'
  : 'middleware.ts';
check(mwPath, 'Middleware file', (c) => {
  if (!c.includes('withLetStartSetup')) {
    return 'Missing withLetStartSetup wrapper. The setup wizard gate has been removed!';
  }
});

// 3. Setup page exists?
check('src/app/setup/page.tsx', 'Setup wizard page');

// 4. API route exists?
check('src/app/api/letstart-setup/route.ts', 'Setup API route');

// 5. .npmrc exists?
check('.npmrc', 'GitHub Packages registry config', (c) => {
  if (!c.includes('@letstartccorp:registry')) {
    return 'Missing @letstartccorp:registry line';
  }
});

// 6. package.json has dependency?
check('package.json', 'package.json', (c) => {
  try {
    const pkg = JSON.parse(c);
    if (!pkg.dependencies?.['@letstartccorp/setup']) {
      return '@letstartccorp/setup is missing from dependencies!';
    }
  } catch {
    return 'Cannot parse package.json';
  }
});

if (errors.length > 0) {
  console.error('❌ LetStart Setup validation FAILED:\n');
  errors.forEach((e) => console.error(`  • ${e}`));
  console.error('\n⚠️  The setup wizard will NOT work. Fix the above issues before deploying.');
  console.error('📖  See AGENTS.md for protected file rules.\n');
  process.exit(1);
} else {
  console.log('✅ All setup files verified. Build proceeding.\n');
}
