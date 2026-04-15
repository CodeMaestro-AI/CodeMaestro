#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');

// Check Node.js version >= 18
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`\nERROR: Node.js >= 18 is required. You have v${process.versions.node}.`);
  console.error('Download the latest LTS at https://nodejs.org\n');
  process.exit(1);
}
console.log(`\u2713 Node.js v${process.versions.node} (>= 18 required)`);

// Install polyglot dependencies
const polyglotDir = path.join(__dirname, 'polyglot');
console.log('\u2713 Installing polyglot dependencies...');
try {
  execSync('npm install', { cwd: polyglotDir, stdio: 'inherit' });
} catch (err) {
  console.error('\nERROR: npm install failed in polyglot/');
  process.exit(1);
}

// Smoke test: confirm jest is available
console.log('\u2713 Checking Jest...');
try {
  const jestVersion = execSync('npx jest --version', { cwd: polyglotDir }).toString().trim();
  console.log(`\u2713 Jest v${jestVersion} ready`);
} catch (err) {
  console.error('\nERROR: jest smoke test failed. Check polyglot/node_modules.');
  process.exit(1);
}

// Success
console.log('\nSetup complete. Run:\n');
console.log('  npm run polyglot -- --harness ./harnesses/claude-code.js');
console.log('  npm run multifile -- --harness ./harnesses/claude-code.js');
console.log('  npm run compare\n');
