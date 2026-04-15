# red-exec Benchmark Suite

## What This Suite Measures

This suite scores any coding agent on two dimensions: **breadth** (49 single-file JavaScript exercises from Exercism) and **depth** (3 multi-file refactoring fixtures derived from real production tasks). The polyglot suite measures whether an agent can implement correct solutions across a diverse range of algorithm classes — string manipulation, graph search, reactive programming, constraint solving, parsers, and state machines. The multi-file suite measures whether an agent can coordinate changes across multiple files: creating new systems from convention examples, replacing deprecated tools while deleting dead code, and splitting monolithic modules into focused sub-modules. Scoring is deterministic: polyglot exercises pass or fail via `npm test`, and multi-file fixtures are scored by `checks.json` (structural checks that require no LLM). Token counts are self-reported via optional fields in the results JSON.

---

## Prerequisites

- **Node.js 18+** — check with `node --version`
- **Your agent CLI installed and authenticated** — e.g., `codex`, `claude`, `aider`, or `red-exec`

---

## Quick Start

```bash
# 1. Install polyglot dependencies (jest + babel — one-time setup)
npm run setup

# 2. Run the polyglot suite with your agent
npm run polyglot -- --harness ./harnesses/codex.js

# 3. Compare your results against published baselines
npm run compare -- --results ./results/<output-file>.json
```

The runner prints progress as it goes and writes a timestamped JSON file to `results/` when done.

---

## Multi-File Quick Start

```bash
# Run all 3 multi-file fixtures
npm run multifile -- --harness ./harnesses/codex.js --all

# Run a single fixture
npm run multifile -- --harness ./harnesses/codex.js --fixture pipeline-skeleton

# Compare multi-file results
npm run compare -- --results ./results/multifile-codex-<timestamp>.json
```

---

## How to Write a Custom Harness

The runner calls your harness as:

```
node <harness.js> <workspace-dir>
```

Your harness must:
1. Receive the workspace directory as `process.argv[2]`
2. Read `TASK.md` from that directory for the task prompt
3. Read `FILES.txt` from that directory for the list of files to modify (one per line)
4. Run your agent with the task as its prompt, with `cwd` set to the workspace directory
5. Exit when the agent is done

That is the entire contract. The runner handles setup, scoring, timing, and results.

### Minimal Example

```javascript
// harnesses/my-agent.js
const { execSync } = require('child_process');
const fs = require('fs');

const dir = process.argv[2];
const task = fs.readFileSync(dir + '/TASK.md', 'utf8');
const files = fs.readFileSync(dir + '/FILES.txt', 'utf8').trim().split('\n').join(' ');

execSync(`my-agent ${JSON.stringify(task)} --files ${files}`, { cwd: dir, stdio: 'inherit' });
```

Use `JSON.stringify(task)` to safely quote the task text — TASK.md often contains newlines and special characters. Use `stdio: 'inherit'` so the agent's output is visible during the run.

---

## Scoring

### Polyglot (49 JS exercises)

Each exercise ships with a stub file, a test file (`*.spec.js`), and a `TASK.md`. The runner:
1. Copies the exercise into a temp workspace
2. Calls `node <harness.js> <workspace>` and waits for exit
3. Runs `npm test` (jest) in the workspace and captures the exit code
4. Records pass/fail and wall time

Pass = `npm test` exits 0. The test files are pre-enabled (no `xtest`). Do not modify them.

### Multi-File (3 fixtures)

Each fixture ships with a `workspace/` directory (starting state), a `TASK.md`, a `FILES.txt`, and a `checks.json`. The runner:
1. Copies `workspace/` into a temp directory
2. Copies `TASK.md` and `FILES.txt` into the temp directory
3. Calls `node <harness.js> <temp-dir>` and waits for exit
4. Runs `node score.js --workspace <temp-dir> --checks <fixture>/checks.json`
5. Records checks passed / total

Check types: `file_exists`, `file_not_exists`, `node_compiles`, `valid_json`, `exports_symbol`, `exports_count`, `content_match`, `content_absent`, `file_contains`, `runtime_load`.

---

## Published Baselines

### Polyglot — 49 JavaScript exercises (Exercism), 2026-04

| Agent | Model | Pass rate | Total tokens | Total wall time | Avg tokens/exercise |
|---|---|---|---|---|---|
| **red-exec** | deepseek-chat | **49/49 (100%)** | 689K | 4,612s (76.9 min) | 14.1K |
| Cline CLI | deepseek-chat | 49/49 (100%) | 10,287K | 5,183s (86 min) | 209.9K |
| Cline CLI | gpt-5.2 | 49/49 (100%) | 3,831K | 2,484s (41.4 min) | 78.2K |

Token savings vs Cline CLI (deepseek-chat): **93.3%** (14.9x ratio). red-exec is faster despite using 15x fewer tokens because the structured pipeline avoids quadratic context growth.

### Multi-File — `refactor-pipeline-split` (12 checks), 2026-04

| Agent | Model | Pass rate (runs) | Avg score | Avg tokens | Avg wall time |
|---|---|---|---|---|---|
| **red-exec** | deepseek-chat | **5/5 (100%)** | 12/12 (100%) | 18.5K | 142s |
| Claude Code | claude-sonnet | 3/3 (100%) | 12/12 (100%) | ~473K | 409s |
| baseline-cline | deepseek-chat | 1/3 (33%) | — | 697K | 277–564s |

### Multi-File — `build-search-replace-tool` (13 checks), 2026-04

| Agent | Model | Pass rate (runs) | Avg score | Avg tokens | Avg wall time |
|---|---|---|---|---|---|
| **red-exec** | deepseek-chat | **3/3 (100%)** | 13/13 (100%) | 44.0K | 263s |
| Claude Code | claude-sonnet | 1/1 (100%) | 13/13 (100%) | 547K | 147s |
| Cline CLI | deepseek-chat | 1/1 (100%) | 13/13 (100%) | 1,269K | 440s |
| Cline CLI | gpt-5.2 | 0/1 (0%) | — | 579K | 435s |

---

## FAQ

### How are tokens counted?

Tokens are self-reported. The runner does not intercept API calls. To include token data in your results, set `BENCHMARK_TOKENS=1` in your harness and write the count to `<workspace>/.tokens` as a plain integer before exiting. The runner reads this file if present and includes it in the results JSON.

### How do I tune the per-exercise timeout?

Default timeout is 5 minutes (300s) for polyglot and 10 minutes (600s) for multi-file. Override with `--timeout <seconds>`:

```bash
npm run polyglot -- --harness ./harnesses/claude-code.js --timeout 600
npm run multifile -- --harness ./harnesses/aider.js --all --timeout 900
```

If an agent consistently times out on complex exercises (e.g., `alphametics`, `forth`, `react`), increase the timeout rather than skipping — these exercises are solvable but may require multiple agentic turns.

### Does this work on Windows?

Yes. All harnesses are `.js` files (Node.js), not shell scripts. The runner uses `child_process.execSync` with `cwd` set to the workspace directory. No WSL, no `.cmd` wrappers, no path translation needed. File paths inside `FILES.txt` use forward slashes; the runner normalizes them for the host OS.

If your agent CLI requires a specific terminal (e.g., some CLIs use ANSI escape codes that confuse Windows `cmd.exe`), launch from Windows Terminal or PowerShell rather than the legacy command prompt. The benchmark itself has no terminal requirements.

### What license covers the polyglot exercises?

The 49 JavaScript exercises are from [Exercism](https://exercism.org) and are MIT-licensed. See `polyglot/LICENSE` for the full text and attribution. The benchmark runner, fixtures, and scoring scripts are also MIT-licensed. You are free to use, modify, and redistribute this suite for any purpose.

### Can I add my own exercises?

Yes. Add a directory to `polyglot/exercises/javascript/<exercise-name>/` with:
- The stub file to implement (e.g., `bowling.js`)
- A test file (`*.spec.js`) with all tests enabled (no `xtest`)
- A `package.json` pointing to the shared jest config
- `TASK.md` — the prompt (include the instructions and tell the agent which file to implement)
- `FILES.txt` — single line with the stub filename

The runner will pick it up automatically on the next run.
