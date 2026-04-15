// harnesses/red-exec.js -- red-exec binary (ships with alpha release)
// Usage: node red-exec.js <workspace-dir>
const { execSync } = require('child_process');
const fs = require('fs');

const dir = process.argv[2];
const task = fs.readFileSync(dir + '/TASK.md', 'utf8');
const files = fs.readFileSync(dir + '/FILES.txt', 'utf8').trim().split('\n').join(' ');

execSync(`red-exec ${JSON.stringify(task)} --files ${files}`, { cwd: dir, stdio: 'inherit' });
