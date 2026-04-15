#!/usr/bin/env node
'use strict';

/**
 * run-multifile.js — Standalone multi-file benchmark runner
 * Zero LLMOS dependencies. Node.js builtins + score.js only.
 *
 * Usage:
 *   node run-multifile.js --harness ./harnesses/codex.js --fixture pipeline-skeleton
 *   node run-multifile.js --harness ./harnesses/codex.js --all
 *   node run-multifile.js --harness ./harnesses/codex.js --all --timeout 600
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    harness: null,
    fixture: null,
    all: false,
    timeout: 600,
    maxRetries: 0,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--harness':
        opts.harness = args[++i];
        break;
      case '--fixture':
        opts.fixture = args[++i];
        break;
      case '--all':
        opts.all = true;
        break;
      case '--timeout':
        opts.timeout = parseInt(args[++i], 10);
        break;
      case '--max-retries':
        opts.maxRetries = parseInt(args[++i], 10);
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!opts.harness) {
    console.error('Error: --harness <path> is required');
    console.error('  node run-multifile.js --harness ./harnesses/codex.js --all');
    console.error('  node run-multifile.js --harness ./harnesses/codex.js --fixture pipeline-skeleton');
    process.exit(1);
  }

  if (!opts.fixture && !opts.all) {
    console.error('Error: either --fixture <name> or --all is required');
    process.exit(1);
  }

  if (isNaN(opts.timeout) || opts.timeout < 1) {
    console.error('Error: --timeout must be a positive integer (seconds)');
    process.exit(1);
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Fixture discovery
// ---------------------------------------------------------------------------

const RUNNER_DIR = __dirname;
const FIXTURES_DIR = path.join(RUNNER_DIR, 'multifile', 'fixtures');
const WORK_DIR = path.join(RUNNER_DIR, '.multifile-work');
const RESULTS_DIR = path.join(RUNNER_DIR, 'results');
const SCORE_JS = path.join(RUNNER_DIR, 'score.js');

function discoverFixtures(filter) {
  if (!fs.existsSync(FIXTURES_DIR)) {
    console.error(`Error: fixtures directory not found: ${FIXTURES_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true });
  const fixtures = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const checksFile = path.join(FIXTURES_DIR, entry.name, 'checks.json');
    if (!fs.existsSync(checksFile)) continue;
    if (filter && entry.name !== filter) continue;
    fixtures.push(entry.name);
  }

  fixtures.sort();

  if (filter && fixtures.length === 0) {
    console.error(`Error: fixture '${filter}' not found in ${FIXTURES_DIR}`);
    process.exit(1);
  }

  return fixtures;
}

// ---------------------------------------------------------------------------
// Working directory setup
// ---------------------------------------------------------------------------

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function prepareWorkDir(fixtureName) {
  const fixtureDir = path.join(FIXTURES_DIR, fixtureName);
  const workspaceDir = path.join(fixtureDir, 'workspace');
  const workDir = path.join(WORK_DIR, fixtureName);

  // Clean previous run
  if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }

  // Copy workspace/ contents into working dir
  if (fs.existsSync(workspaceDir)) {
    copyDir(workspaceDir, workDir);
  } else {
    fs.mkdirSync(workDir, { recursive: true });
  }

  // Copy TASK.md and FILES.txt from fixture root into working dir
  for (const file of ['TASK.md', 'FILES.txt']) {
    const src = path.join(fixtureDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(workDir, file));
    }
  }

  return workDir;
}

function npmInstall(workDir) {
  const pkgJson = path.join(workDir, 'package.json');
  if (!fs.existsSync(pkgJson)) return;

  const result = spawnSync('npm install', [], {
    cwd: workDir,
    stdio: 'pipe',
    shell: true,
    timeout: 120000,
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString().trim() : '';
    throw new Error(`npm install failed (exit ${result.status})${stderr ? ': ' + stderr.slice(0, 200) : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Harness execution
// ---------------------------------------------------------------------------

function runHarness(harnessPath, workDir, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    let timedOut = false;

    const child = spawn(process.execPath, [harnessPath, workDir], {
      stdio: 'pipe',
      cwd: workDir,
    });

    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stdout += d; });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} }, 5000);
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      let totalTokens = 0;
      let llmCalls = 0;
      let costUsd = 0;
      for (const m of stdout.matchAll(/Tokens:\s*([\d,]+)t/g)) {
        totalTokens += parseInt(m[1].replace(/,/g, ''), 10);
      }
      for (const m of stdout.matchAll(/Calls:\s*(\d+)/g)) {
        llmCalls += parseInt(m[1], 10);
      }
      for (const m of stdout.matchAll(/cost:\s*\$([\d.]+)/g)) {
        costUsd += parseFloat(m[1]);
      }
      resolve({ exitCode: code, timedOut, wallMs: Date.now() - start, totalTokens, llmCalls, costUsd });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exitCode: null, timedOut: false, error: err.message, wallMs: Date.now() - start, totalTokens: 0, llmCalls: 0 });
    });
  });
}

// ---------------------------------------------------------------------------
// Scoring via score.js
// ---------------------------------------------------------------------------

function runScorer(workDir, checksFile) {
  const result = spawnSync(
    process.execPath,
    [SCORE_JS, '--workspace', workDir, '--checks', checksFile],
    { encoding: 'utf8', timeout: 30000 }
  );

  if (result.error) {
    throw new Error(`score.js spawn error: ${result.error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(`score.js produced invalid JSON: ${result.stdout.slice(0, 200)}`);
  }

  return parsed; // { total, passed, failed, pass_rate, checks: [...] }
}

function zeroScore(fixtureName, checksFile) {
  // Return a zero score without running score.js (used when harness fails/times out)
  let total = 0;
  try {
    const checks = JSON.parse(fs.readFileSync(checksFile, 'utf8'));
    total = Array.isArray(checks) ? checks.length : 0;
  } catch (_) {}
  return { total, passed: 0, failed: total, pass_rate: 0, checks: [] };
}

// ---------------------------------------------------------------------------
// Single fixture runner
// ---------------------------------------------------------------------------

async function runFixture(fixtureName, harnessPath, timeoutS) {
  const fixtureDir = path.join(FIXTURES_DIR, fixtureName);
  const checksFile = path.join(fixtureDir, 'checks.json');
  const timeoutMs = timeoutS * 1000;

  let workDir;
  let note = '';
  let scoreData;

  // Setup working directory
  try {
    workDir = prepareWorkDir(fixtureName);
  } catch (err) {
    note = `workspace setup failed: ${err.message}`;
    scoreData = zeroScore(fixtureName, checksFile);
    console.log(`[${fixtureName}] 0/${scoreData.total} checks passed — ${note}`);
    return buildResult(fixtureName, scoreData, note);
  }

  // npm install if workspace has package.json
  try {
    npmInstall(workDir);
  } catch (err) {
    note = err.message;
    scoreData = zeroScore(fixtureName, checksFile);
    console.log(`[${fixtureName}] 0/${scoreData.total} checks passed — ${note}`);
    return buildResult(fixtureName, scoreData, note);
  }

  // Run harness
  const harness = await runHarness(harnessPath, workDir, timeoutMs);

  if (harness.timedOut) {
    note = `harness timed out after ${timeoutS}s`;
    scoreData = zeroScore(fixtureName, checksFile);
    console.log(`[${fixtureName}] 0/${scoreData.total} checks passed — ${note}`);
    return buildResult(fixtureName, scoreData, note);
  }

  if (harness.error) {
    note = `harness error: ${harness.error}`;
    scoreData = zeroScore(fixtureName, checksFile);
    console.log(`[${fixtureName}] 0/${scoreData.total} checks passed — ${note}`);
    return buildResult(fixtureName, scoreData, note);
  }

  if (harness.exitCode !== 0) {
    note = `harness exited with code ${harness.exitCode}`;
    // Still score — agent may have partially succeeded despite non-zero exit
  }

  // Score workspace
  try {
    scoreData = runScorer(workDir, checksFile);
  } catch (err) {
    note = (note ? note + '; ' : '') + `scorer error: ${err.message}`;
    scoreData = zeroScore(fixtureName, checksFile);
  }

  const summary = `${scoreData.passed}/${scoreData.total} checks passed`;
  const label = note ? `${summary} — ${note}` : summary;
  console.log(`[${fixtureName}] ${label}`);

  const res = buildResult(fixtureName, scoreData, note);
  if (harness.totalTokens) res.totalTokens = harness.totalTokens;
  if (harness.llmCalls) res.llmCalls = harness.llmCalls;
  if (harness.costUsd) res.costUsd = harness.costUsd;
  res.wallMs = harness.wallMs;
  return res;
}

function buildResult(fixtureName, scoreData, note) {
  const result = {
    fixture: fixtureName,
    total: scoreData.total,
    passed: scoreData.passed,
    failed: scoreData.failed,
    pass_rate: scoreData.pass_rate,
    checks: scoreData.checks,
  };
  if (note) result.note = note;
  return result;
}

// ---------------------------------------------------------------------------
// Results writing
// ---------------------------------------------------------------------------

function writeResults(opts, fixtures, results) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const harnessName = path.basename(opts.harness, '.js');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `multifile-${harnessName}-${timestamp}.json`;
  const outPath = path.join(RESULTS_DIR, filename);

  const output = {
    suite: 'multifile',
    harness: opts.harness,
    timestamp: new Date().toISOString(),
    fixtures: fixtures.length,
    results,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  return { outPath, output };
}

function printSummary(output, outPath) {
  const totalChecks = output.results.reduce((s, r) => s + r.total, 0);
  const totalPassed = output.results.reduce((s, r) => s + r.passed, 0);
  const pct = totalChecks > 0 ? ((totalPassed / totalChecks) * 100).toFixed(1) : '0.0';
  const totalTokens = output.results.reduce((s, r) => s + (r.totalTokens || 0), 0);
  const totalCalls = output.results.reduce((s, r) => s + (r.llmCalls || 0), 0);

  console.log('');
  console.log('─'.repeat(50));
  console.log(`Fixtures: ${output.fixtures}`);
  console.log(`Checks:   ${totalPassed}/${totalChecks} passed (${pct}%)`);
  const totalCost = output.results.reduce((s, r) => s + (r.costUsd || 0), 0);
  if (totalTokens > 0) {
    let tokenLine = `Tokens:   ${totalTokens.toLocaleString()}t total (${totalCalls} LLM calls)`;
    if (totalCost > 0) tokenLine += ` — $${totalCost.toFixed(4)}`;
    console.log(tokenLine);
    for (const r of output.results) {
      if (r.totalTokens) {
        let line = `  ${r.fixture}: ${r.totalTokens.toLocaleString()}t (${r.llmCalls || 0} calls, ${((r.wallMs || 0) / 1000).toFixed(0)}s)`;
        if (r.costUsd) line += ` $${r.costUsd.toFixed(4)}`;
        console.log(line);
      }
    }
  }
  console.log(`Written:  ${outPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv);

  const harnessPath = path.resolve(opts.harness);
  if (!fs.existsSync(harnessPath)) {
    console.error(`Error: harness not found: ${harnessPath}`);
    process.exit(1);
  }

  const fixtures = discoverFixtures(opts.all ? null : opts.fixture);
  const total = fixtures.length;

  console.log(`Multifile benchmark — ${total} fixture(s)`);
  console.log(`Harness: ${harnessPath}`);
  console.log(`Timeout: ${opts.timeout}s`);
  if (opts.maxRetries > 0) console.log(`Max retries: ${opts.maxRetries}`);
  console.log('');

  fs.mkdirSync(WORK_DIR, { recursive: true });

  const results = [];
  for (const fixtureName of fixtures) {
    let result = await runFixture(fixtureName, harnessPath, opts.timeout);
    if (result.passed < result.total && opts.maxRetries > 0) {
      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        console.log(`  [RETRY] ${fixtureName}: attempt ${attempt + 1}/${opts.maxRetries + 1} (was ${result.passed}/${result.total})`);
        result = await runFixture(fixtureName, harnessPath, opts.timeout);
        if (result.passed === result.total) {
          result.freshRetries = attempt;
          console.log(`  [RETRY] ${fixtureName}: PASS on attempt ${attempt + 1}`);
          break;
        }
      }
      if (result.passed < result.total) result.freshRetries = opts.maxRetries;
    }
    results.push(result);
  }

  const { outPath, output } = writeResults(opts, fixtures, results);
  printSummary(output, outPath);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
