#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// ---------------------------------------------------------------------------
// Arg parsing (no external deps)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--workspace' && argv[i + 1]) args.workspace = argv[++i];
    else if (argv[i] === '--checks' && argv[i + 1]) args.checks = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args.workspace || !args.checks) {
  process.stderr.write('Usage: node score.js --workspace <dir> --checks <checks.json>\n');
  process.exit(1);
}

const workspace = path.resolve(args.workspace);
const checksFile = path.resolve(args.checks);

if (!fs.existsSync(workspace)) {
  process.stderr.write(`Error: workspace not found: ${workspace}\n`);
  process.exit(1);
}
if (!fs.existsSync(checksFile)) {
  process.stderr.write(`Error: checks file not found: ${checksFile}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load checks
// ---------------------------------------------------------------------------
let checks;
try {
  checks = JSON.parse(fs.readFileSync(checksFile, 'utf8'));
} catch (e) {
  process.stderr.write(`Error: failed to parse checks file: ${e.message}\n`);
  process.exit(1);
}

if (!Array.isArray(checks)) {
  process.stderr.write('Error: checks.json must be an array\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
function runCheck(check) {
  const resolved = check.path ? path.join(workspace, check.path) : null;

  try {
    switch (check.type) {
      case 'file_exists':
        return fs.existsSync(resolved);

      case 'file_not_exists':
        return !fs.existsSync(resolved);

      case 'node_compiles':
        return child_process.spawnSync('node', ['-c', resolved], { encoding: 'utf8' }).status === 0;

      case 'valid_json': {
        const raw = fs.readFileSync(resolved, 'utf8');
        JSON.parse(raw);
        return true;
      }

      case 'exports_symbol': {
        const mod = require(resolved);
        return mod[check.symbol] !== undefined;
      }

      case 'exports_count': {
        const mod = require(resolved);
        return Object.keys(mod).length === check.expected;
      }

      case 'content_match': {
        const content = fs.readFileSync(resolved, 'utf8');
        return new RegExp(check.pattern).test(content);
      }

      case 'content_absent': {
        const content = fs.readFileSync(resolved, 'utf8');
        return !new RegExp(check.pattern).test(content);
      }

      case 'file_contains': {
        const content = fs.readFileSync(resolved, 'utf8');
        return content.includes(check.text);
      }

      case 'runtime_load': {
        require(resolved);
        return true;
      }

      case 'runtime_exports': {
        const mod = require(resolved);
        for (const [name, expectedType] of Object.entries(check.exports || {})) {
          if (!(name in mod)) throw new Error(`missing export: ${name}`);
          if (expectedType && typeof mod[name] !== expectedType) {
            throw new Error(`${name} is ${typeof mod[name]}, expected ${expectedType}`);
          }
        }
        return true;
      }

      default:
        throw new Error(`Unknown check type: ${check.type}`);
    }
  } catch (e) {
    return { passed: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------
const results = checks.map((check, i) => {
  const raw = runCheck(check);
  const passed = typeof raw === 'object' ? raw.passed : raw === true;
  const error = typeof raw === 'object' ? raw.error : undefined;
  return {
    index: i,
    type: check.type,
    path: check.path || null,
    description: check.description || null,
    passed,
    ...(error ? { error } : {}),
  };
});

const total = results.length;
const passed = results.filter(r => r.passed).length;
const failed = total - passed;
const pass_rate = total > 0 ? passed / total : 0;

const output = { total, passed, failed, pass_rate, checks: results };

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
process.stdout.write(JSON.stringify(output, null, 2) + '\n');

// Human-readable summary to stderr
process.stderr.write('\n--- Score Summary ---\n');
results.forEach(r => {
  const icon = r.passed ? 'PASS' : 'FAIL';
  const label = r.description || `${r.type}${r.path ? ': ' + r.path : ''}`;
  const err = r.error ? ` (${r.error})` : '';
  process.stderr.write(`  [${icon}] ${label}${err}\n`);
});
process.stderr.write(`\nResult: ${passed}/${total} passed (${(pass_rate * 100).toFixed(1)}%)\n`);

process.exit(failed > 0 ? 1 : 0);
