// harnesses/aider.js -- Aider (https://aider.chat)
// Usage: node aider.js <workspace-dir>
// Requires: aider installed and API key configured
const { execSync } = require('child_process');
const fs = require('fs');

const dir = process.argv[2];
const task = fs.readFileSync(dir + '/TASK.md', 'utf8');
const files = fs.readFileSync(dir + '/FILES.txt', 'utf8').trim().split('\n').join(' ');

execSync(`aider --message ${JSON.stringify(task)} --yes --file ${files}`, { cwd: dir, stdio: 'inherit' });
