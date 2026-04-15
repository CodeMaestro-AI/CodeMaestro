// harnesses/claude-code.js -- Claude Code CLI (https://claude.ai/code)
// Usage: node claude-code.js <workspace-dir>
// Requires: claude CLI installed and authenticated
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('Usage: node claude-code.js <workspace-dir>'); process.exit(1); }

const task = fs.readFileSync(path.join(dir, 'TASK.md'), 'utf8');

// Resolve the actual claude CLI JS entry point (npm global install)
function findClaudeCli() {
  var npmGlobal = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm')
    : path.join(require('os').homedir(), '.npm-global', 'lib');
  var candidates = [
    path.join(npmGlobal, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
    path.join(npmGlobal, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.mjs'),
  ];
  for (var c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

var cliPath = findClaudeCli();
if (!cliPath) {
  console.error('Could not find claude-code CLI. Install with: npm install -g @anthropic-ai/claude-code');
  process.exit(1);
}

var stdout;
try {
  stdout = execFileSync(process.execPath, [cliPath, '-p', task, '--output-format', 'json', '--permission-mode', 'bypassPermissions'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 600000,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
} catch (err) {
  if (err.stdout) stdout = err.stdout;
  else { console.error('claude CLI error:', err.message); process.exit(1); }
}

try {
  var parsed = JSON.parse(stdout);
  var inp = (parsed.usage && parsed.usage.input_tokens) || 0;
  var out = (parsed.usage && parsed.usage.output_tokens) || 0;
  var cache = (parsed.usage && parsed.usage.cache_read_input_tokens) || 0;
  var cost = parsed.total_cost_usd || 0;
  var dur = parsed.duration_ms || 0;
  var total = inp + out + cache;
  console.log('Time: ' + dur + 'ms | Tokens: ' + total + 't | Calls: 1');
  console.log('  input_tokens: ' + inp);
  console.log('  output_tokens: ' + out);
  if (cache) console.log('  cache_read: ' + cache);
  console.log('  cost: $' + cost.toFixed(4));
} catch (_) {
  console.log(stdout);
}
