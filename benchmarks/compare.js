'use strict';
const fs = require('fs');
const path = require('path');

// --- Arg parsing ---
function parseArgs(argv) {
  const args = { results: null, baseline: null, detail: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--results' && argv[i + 1]) args.results = argv[++i];
    else if (argv[i] === '--baseline' && argv[i + 1]) args.baseline = argv[++i];
    else if (argv[i] === '--detail') args.detail = true;
  }
  return args;
}

// --- Load baselines ---
function loadBaselines(scriptDir, suiteType, onlyName) {
  const baselinesDir = path.join(scriptDir, 'baselines');
  if (!fs.existsSync(baselinesDir)) return [];

  let files = fs.readdirSync(baselinesDir).filter((f) => f.endsWith('.json'));
  if (onlyName) {
    const target = onlyName.endsWith('.json') ? onlyName : onlyName + '.json';
    files = files.filter((f) => f === target);
  }

  const baselines = [];
  for (const file of files.sort()) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(baselinesDir, file), 'utf8'));
      const s = (data.suite || '').toLowerCase();
      if (suiteType === 'polyglot' && !s.includes('polyglot')) continue;
      if (suiteType === 'multifile' && !s.includes('multifile')) continue;
      baselines.push({ file, data });
    } catch {
      // Skip malformed baseline files
    }
  }
  return baselines;
}

// --- Labels ---
function getHarnessLabel(harnessPath) {
  if (!harnessPath) return 'unknown';
  return path.basename(harnessPath).replace(/\.(js|sh|py)$/, '');
}

const KNOWN_AGENTS = ['red-exec', 'cline-cli', 'claude-code', 'codex', 'aider', 'cursor'];

function getBaselineLabels(file, data) {
  if (data.agent && data.model) return { line1: data.agent, line2: `(${data.model})` };

  const name = file.replace(/\.json$/, '');
  for (const a of KNOWN_AGENTS) {
    if (name.startsWith(a + '-')) {
      const modelPart = name.slice(a.length + 1);
      return { line1: a, line2: `(${modelPart})` };
    }
  }
  return { line1: name, line2: '' };
}

// --- Formatting helpers ---
function padRight(str, len) {
  str = String(str == null ? '--' : str);
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function fmtNum(n) {
  if (n == null) return '--';
  return n.toLocaleString('en-US');
}

// --- Polyglot comparison ---
function printPolyglotComparison(userResult, baselines, opts) {
  const userHarnessLabel = getHarnessLabel(userResult.harness);

  const columns = [
    { line1: 'Your Agent', line2: `(${userHarnessLabel})`, data: userResult },
  ];
  for (const { file, data } of baselines) {
    const lbl = getBaselineLabels(file, data);
    columns.push({ line1: lbl.line1, line2: lbl.line2, data });
  }

  const ROW_LABEL = 26;
  const COL = 22;

  console.log('=== Polyglot Benchmark Comparison ===\n');

  // Header
  let h1 = padRight('', ROW_LABEL);
  let h2 = padRight('', ROW_LABEL);
  for (const col of columns) {
    h1 += padRight(col.line1, COL);
    h2 += padRight(col.line2, COL);
  }
  console.log(h1);
  if (columns.some((c) => c.line2)) console.log(h2);
  console.log('');

  // Pass rate
  let passRow = padRight('Pass rate', ROW_LABEL);
  for (const col of columns) {
    const d = col.data;
    const pct = Math.round((d.pass_rate || 0) * 100);
    passRow += padRight(`${d.passed}/${d.exercises} (${pct}%)`, COL);
  }
  console.log(passRow);

  // Total wall time
  let wallRow = padRight('Total wall time', ROW_LABEL);
  for (const col of columns) {
    const d = col.data;
    wallRow +=
      d.total_wall_time_s != null
        ? padRight(`${fmtNum(d.total_wall_time_s)}s`, COL)
        : padRight('--', COL);
  }
  console.log(wallRow);

  // Avg wall time
  let avgRow = padRight('Avg wall time/exercise', ROW_LABEL);
  for (const col of columns) {
    const d = col.data;
    if (d.total_wall_time_s != null && d.exercises) {
      avgRow += padRight(`${(d.total_wall_time_s / d.exercises).toFixed(1)}s`, COL);
    } else {
      avgRow += padRight('--', COL);
    }
  }
  console.log(avgRow);
  console.log('');

  // Failed exercises (user only)
  const failed = (userResult.results || []).filter(
    (r) => r.status === 'FAIL' || r.pass === false
  );
  if (failed.length > 0) {
    console.log(`Failed exercises: ${failed.map((r) => r.exercise).join(', ')}`);
  } else {
    console.log('Failed exercises: none');
  }

  if (opts.detail) {
    printPolyglotDetail(columns, ROW_LABEL, COL);
  } else {
    console.log('\nPer-exercise breakdown: (use --detail for full table)');
  }
}

function printPolyglotDetail(columns, ROW_LABEL, COL) {
  console.log('\n--- Per-Exercise Detail ---');

  const allExercises = new Set();
  for (const col of columns) {
    for (const r of col.data.results || []) allExercises.add(r.exercise);
  }

  const EX_WIDTH = 28;
  let header = padRight('Exercise', EX_WIDTH);
  for (const col of columns) header += padRight(col.line1, COL);
  console.log(header);

  for (const ex of [...allExercises].sort()) {
    let row = padRight(ex, EX_WIDTH);
    for (const col of columns) {
      const r = (col.data.results || []).find((x) => x.exercise === ex);
      if (!r) {
        row += padRight('--', COL);
      } else {
        const passed = r.status === 'PASS' || r.pass === true;
        row += padRight(passed ? 'PASS' : 'FAIL', COL);
      }
    }
    console.log(row);
  }
}

// --- Multifile comparison ---
function printMultifileComparison(userResult, baselines, opts) {
  const userHarnessLabel = getHarnessLabel(userResult.harness);

  const columns = [
    { line1: `Your Agent (${userHarnessLabel})`, line2: '', data: userResult },
  ];
  for (const { file, data } of baselines) {
    const lbl = getBaselineLabels(file, data);
    columns.push({
      line1: lbl.line2 ? `${lbl.line1} ${lbl.line2}` : lbl.line1,
      line2: '',
      data,
    });
  }

  // Collect all fixture names
  const allFixtures = new Set();
  for (const col of columns) {
    for (const f of getFixtures(col.data)) allFixtures.add(fixtureName(f));
  }

  const FIX_WIDTH = 24;
  const COL = 20;

  console.log('=== Multi-File Benchmark Comparison ===\n');

  let header = padRight('', FIX_WIDTH);
  for (const col of columns) header += padRight(col.line1, COL);
  console.log(header);
  console.log('');

  for (const fix of [...allFixtures].sort()) {
    let row = padRight(fix, FIX_WIDTH);
    for (const col of columns) {
      const f = getFixtures(col.data).find((x) => fixtureName(x) === fix);
      if (!f) {
        row += padRight('--', COL);
      } else {
        const total = f.total != null ? f.total : (f.checks ? f.checks.length : '--');
        const passed =
          f.passed != null
            ? f.passed
            : f.checks
            ? f.checks.filter((c) => c.pass).length
            : '--';
        row += padRight(`${passed}/${total}`, COL);
      }
    }
    console.log(row);
  }

  if (opts.detail) {
    printMultifileDetail(columns, allFixtures);
  }
}

function getFixtures(data) {
  if (Array.isArray(data.fixtures)) return data.fixtures;
  return data.results || [];
}

function fixtureName(f) {
  return f.fixture || f.name || '(unknown)';
}

function printMultifileDetail(columns, allFixtures) {
  console.log('\n--- Per-Check Detail ---');

  const CHECK_WIDTH = 36;
  const COL = 12;

  for (const fix of [...allFixtures].sort()) {
    console.log(`\n[${fix}]`);

    const allChecks = new Set();
    for (const col of columns) {
      const f = getFixtures(col.data).find((x) => fixtureName(x) === fix);
      if (f && f.checks) {
        for (const c of f.checks) allChecks.add(c.id);
      }
    }

    if (allChecks.size === 0) {
      console.log('  (no check detail available)');
      continue;
    }

    let header = padRight('Check', CHECK_WIDTH);
    for (const col of columns) header += padRight(col.line1.split(' ')[0], COL);
    console.log(header);

    for (const checkId of [...allChecks].sort()) {
      let row = padRight(checkId, CHECK_WIDTH);
      for (const col of columns) {
        const f = getFixtures(col.data).find((x) => fixtureName(x) === fix);
        const c = f && f.checks ? f.checks.find((x) => x.id === checkId) : null;
        row += padRight(c ? (c.pass ? 'pass' : 'FAIL') : '--', COL);
      }
      console.log(row);
    }
  }
}

// --- Main ---
function main() {
  const args = parseArgs(process.argv);

  if (!args.results) {
    console.error(
      'Usage: node compare.js --results <results.json> [--baseline <name>] [--detail]'
    );
    console.error('');
    console.error('Examples:');
    console.error('  node compare.js --results ./results/polyglot-codex-2026-04-12.json');
    console.error('  node compare.js --results ./results/multifile-codex-2026-04-12.json');
    console.error(
      '  node compare.js --results ./results/polyglot-codex.json --baseline red-exec-deepseek-chat'
    );
    process.exit(1);
  }

  let userResult;
  try {
    userResult = JSON.parse(fs.readFileSync(args.results, 'utf8'));
  } catch (e) {
    console.error(`Error loading results file: ${e.message}`);
    process.exit(1);
  }

  const suite = (userResult.suite || '').toLowerCase();
  const suiteType = suite.includes('multifile') ? 'multifile' : 'polyglot';

  const scriptDir = path.dirname(path.resolve(process.argv[1]));
  const baselines = loadBaselines(scriptDir, suiteType, args.baseline);

  if (baselines.length === 0 && args.baseline) {
    console.error(`Baseline not found: ${args.baseline}`);
    process.exit(1);
  }

  if (suiteType === 'multifile') {
    printMultifileComparison(userResult, baselines, args);
  } else {
    printPolyglotComparison(userResult, baselines, args);
  }
}

main();
