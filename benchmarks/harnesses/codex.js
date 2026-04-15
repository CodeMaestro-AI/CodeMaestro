// harnesses/codex.js -- OpenAI Codex CLI
// Usage: node codex.js <workspace-dir>
// Requires: codex CLI installed and OPENAI_API_KEY set
const { execSync } = require('child_process');
const fs = require('fs');

const dir = process.argv[2];
const task = fs.readFileSync(dir + '/TASK.md', 'utf8');

execSync(`codex -q ${JSON.stringify(task)}`, { cwd: dir, stdio: 'inherit' });
