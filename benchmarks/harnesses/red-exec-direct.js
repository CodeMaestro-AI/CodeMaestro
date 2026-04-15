// harnesses/red-exec-direct.js -- calls runRedExecution directly (pre-binary)
// Constructs the XML prompt format that the red-exec pipeline expects.
// Usage: node red-exec-direct.js <workspace-dir>
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('Usage: node red-exec-direct.js <workspace-dir>'); process.exit(1); }

const taskMd = fs.readFileSync(path.join(dir, 'TASK.md'), 'utf8');
const files = fs.readFileSync(path.join(dir, 'FILES.txt'), 'utf8').trim().split('\n').filter(Boolean);

var isPolyglot = files.length === 1 && files[0].endsWith('.js');
var specFile = null;
if (isPolyglot) {
  var base = path.basename(files[0], '.js');
  var specPath = path.join(dir, base + '.spec.js');
  if (fs.existsSync(specPath)) specFile = base + '.spec.js';
}

var solutionContent = '';
if (files.length === 1 && fs.existsSync(path.join(dir, files[0]))) {
  solutionContent = fs.readFileSync(path.join(dir, files[0]), 'utf8');
}

var instructionsMatch = taskMd.match(/# Instructions\n([\s\S]*?)(?:\nThe test file is|\n$|$)/);
var instructions = instructionsMatch ? instructionsMatch[1].trim() : taskMd;

var prompt;
if (isPolyglot && specFile) {
  var testContent = fs.readFileSync(path.join(dir, specFile), 'utf8');
  prompt = '<task_context readonly="true">\n<instructions>\n' + instructions +
    '\n</instructions>\n\n<solution_file file="' + files[0] + '" status="stub">\n' +
    (solutionContent || '(empty)') +
    '\n</solution_file>\n\n<test_file file="' + specFile + '">\n' +
    testContent + '\n</test_file>\n</task_context>\n\n' +
    '<request>\nImplement the complete solution in ' + files[0] + '. All tests must pass.\n</request>';
} else {
  prompt = taskMd;
}

var REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });

var runRedExecution = require(path.join(REPO_ROOT, 'systems', 'core', 'red-execution')).runRedExecution;

var SKILL_MAP = {
  'tool-migration': 'build-search-replace-tool',
  'pipeline-skeleton': 'pcc-arc-pipeline-skeleton',
};
var fixtureName = path.basename(dir);
var benchId = SKILL_MAP[fixtureName] || fixtureName;

var bench = {
  id: benchId,
  prompt: prompt,
  files_involved: files,
  checks: [],
  success_criteria: [],
};

var reportFormatter = require(path.join(REPO_ROOT, 'systems', 'core', 'red-execution', 'lib', 'report', 'reportFormatter'));

runRedExecution({
  bench: bench,
  workDir: dir,
  options: {
    model: process.env.LLM_MODEL || 'deepseek-chat',
    gateEnabled: true,
  },
}).then(function(result) {
  if (result && result.report) {
    console.log(reportFormatter.formatConsole(result.report));
  }
  process.exit(0);
}).catch(function(err) {
  if (err.report) {
    console.log(reportFormatter.formatConsole(err.report));
  }
  console.error('Pipeline error:', err.message);
  process.exit(1);
});
