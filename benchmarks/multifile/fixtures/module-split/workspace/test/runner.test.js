'use strict';

const assert = require('assert');
const runner = require('../lib/runner');

const expectedExports = [
  'initConfig',
  'validateEnvironment',
  'loadPlugins',
  'createContext',
  'executeTask',
  'processQueue',
  'runStep',
  'handleError',
  'collectResults',
  'formatReport',
  'writeOutput',
  'cleanup'
];

let passed = 0;
let failed = 0;

for (const name of expectedExports) {
  try {
    assert.strictEqual(typeof runner[name], 'function', `${name} should be a function`);
    console.log(`  PASS  ${name} exported`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
