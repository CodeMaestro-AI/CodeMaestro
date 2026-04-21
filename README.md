# codeMaestro Alpha

**Version:** 0.1.0-alpha
**CLI command:** `red-exec`
**Default model:** deepseek-chat
**Language:** JavaScript (CommonJS)

codeMaestro is a structured code generation pipeline. You give it a task and a list of files; it decomposes the task, generates code in isolated sections, and writes the output -- with a structural safety gate that prevents destructive writes. It produces the same results as agentic coding tools (100% pass rate on 49 exercises and 44 multi-file checks) while using **15-45x fewer tokens**.

The CLI command is `red-exec`.

---

## Quick Start (Standalone Binary)

No Node.js, no `npm install`, no cloning. Download one file, set your API key, run.

### 1. Pick your binary

| Platform | File | Size |Link|
|---|---|---|---|
| Windows x64 | `red-exec-win-x64.exe` | 72 MB | https://github.com/CodeMaestro-AI/CodeMaestro/releases/download/alpha-0.1.0/red-exec-win-x64.exe|
| Linux x64 (Ubuntu, Debian, etc.) | `red-exec-linux-x64` | 55 MB |https://github.com/CodeMaestro-AI/CodeMaestro/releases/download/alpha-0.1.0/red-exec-linux-x64|
| macOS x64 (Intel, or Apple Silicon via Rosetta 2) | `red-exec-macos-x64` | 60 MB |https://github.com/CodeMaestro-AI/CodeMaestro/releases/download/alpha-0.1.0/red-exec-macos-x64|

### 2. Set your API key

You need at least one API key. Pick your provider:

| Provider | Model | Env variable | Status |
|---|---|---|---|
| **DeepSeek** | `deepseek-chat` (default) | `DEEPSEEK_API_KEY` | **Recommended.** All benchmarks use this model. |
| **OpenAI** | `gpt-4.1-mini`, `gpt-4.1`, `gpt-4o` | `OPENAI_API_KEY` | Supported but not well-tested. Fallback only. |

Get a DeepSeek key at https://platform.deepseek.com/. OpenAI keys at https://platform.openai.com/api-keys.

**Windows (PowerShell):**

```powershell
# DeepSeek (default model, cheapest)
$env:DEEPSEEK_API_KEY = "your-key-here"

# Or OpenAI
$env:OPENAI_API_KEY = "your-key-here"
```

To persist across sessions, add it to your system environment variables:

```powershell
[System.Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "your-key-here", "User")
# or
[System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "your-key-here", "User")
```

**Linux / macOS:**

```bash
# DeepSeek (default model, cheapest)
export DEEPSEEK_API_KEY="your-key-here"

# Or OpenAI
export OPENAI_API_KEY="your-key-here"
```

To persist, add the line to `~/.bashrc`, `~/.zshrc`, or `~/.profile`.

> **Which should I use?** DeepSeek-chat is the default and the model the pipeline was built and tuned for. All benchmark results in this document use DeepSeek-chat. OpenAI models are supported but not well-tested -- expect lower consistency, higher cost, and occasional prompt-format mismatches. Use `--model gpt-4.1-mini` only as a fallback if DeepSeek is unavailable.

### 3. Make it executable (Linux / macOS only)

```bash
chmod +x red-exec-linux-x64    # or red-exec-macos-x64
```

### 4. Run

**Windows:**

```powershell
# With DeepSeek (default)
.\red-exec-win-x64.exe "Add health endpoint" --files src/server.js

# With OpenAI
.\red-exec-win-x64.exe "Add health endpoint" --files src/server.js --model gpt-4.1-mini
```

**Linux / macOS:**

```bash
# With DeepSeek (default)
./red-exec-linux-x64 "Add health endpoint" --files src/server.js

# With OpenAI
./red-exec-linux-x64 "Add health endpoint" --files src/server.js --model gpt-4.1-mini
```

That's it. See [Running Tasks](#running-tasks) and [CLI Reference](#cli-reference) below for the full command set.

---

## What You Can Use Alpha For

The alpha is strongest at **creating new code from a clear spec** and **restructuring existing code into new modules**. These are the tasks where the pipeline consistently produces production-quality output.

### Strong (high confidence, proven at scale)

| Task type | Example | Evidence |
|---|---|---|
| **Create a new module from spec** | "Create a validation module that exports `validate`, `sanitize`, `RULES`" | 49/49 polyglot, 44/44 multifile -- all CREATE-heavy |
| **Split a large file into smaller modules** | "Extract the database layer from app.js into db.js and queries.js" | module-split benchmark: 20/20 checks, 7/7 runs |
| **Migrate code between patterns** | "Move inline SQL queries into a separate query builder module" | tool-migration benchmark: 13/13 checks, 7/7 runs |
| **Create a skeleton with wiring** | "Create a pipeline with stages, a runner, and an index that exports everything" | pipeline-skeleton benchmark: 11/11 checks, 7/7 runs |
| **Implement algorithmic logic** | "Implement bowling scoring, constraint solvers, reactive streams, parsers" | 49 diverse exercises at 100% pass rate |
| **Single-file feature additions** | "Add a health endpoint to this Express server" | Well-scoped single-file tasks with clear inputs |

### Moderate (works, but review the output)

| Task type | What to watch for |
|---|---|
| **Multi-file tasks where files call each other** | Cross-module wiring (imports, method signatures) is correct ~7/8 runs. Mechanical post-processing handles most cases, but novel integration patterns may need a manual fix. |
| **Tasks involving template literals or complex string generation** | LLM occasionally produces unescaped backticks inside template literals (~1 in 8 runs). Built-in retry usually recovers. |
| **Modifying existing files** | The pipeline can modify existing files (proven on files up to 937 lines), but the MODIFY path is less reliable than CREATE for complex changes. Well-scoped modifications (e.g., add a method, extract a section) work reliably. Broad behavioral changes across many functions may need review or a re-run. |
| **CommonJS projects** | DeepSeek-chat sometimes outputs ESM syntax (`export default`) despite explicit CJS instructions (~1 in 8 runs). If this happens, re-run or use `--model gpt-4.1-mini`. |

### What Alpha Cannot Do Well (Yet)

Be honest with yourself about these -- using the alpha for these tasks will produce poor results or waste time.

| Task type | Why it struggles | What to do instead |
|---|---|---|
| **Cross-cutting changes across 3+ existing files** | The pipeline sees only the files you pass to `--files`. It has no codebase-wide understanding of implicit dependencies, call graphs, or side effects. | Break into smaller tasks. Or use an agentic tool that can explore the codebase. |
| **Ambiguous or exploratory tasks** | "Make this faster," "improve the error handling," "refactor this to be cleaner" -- the pipeline needs a concrete spec, not a direction. It executes, it does not explore. | Decide what you want first (with Cursor/Claude), then hand the spec to red-exec. |
| **Tasks requiring deep domain context** | The pipeline knows what you tell it via `--files` and the task description. It does not read your README, your tests, your architecture docs, or your commit history. | Provide context via skill files (`.md` files with conventions, patterns, constraints). |
| **Non-JavaScript languages** | Alpha only supports JavaScript (CommonJS). No TypeScript, Python, or other languages yet. | Wait for post-alpha language support. |
| **Test generation** | Not validated. The pipeline generates implementation code, not test code. | Use your existing test workflow. |
| **Large-scale refactoring (100+ line files with many interdependencies)** | Works for well-scoped extractions (proven up to 937-line files). Struggles when the refactoring requires understanding implicit contracts across many modules. | Break into phases: extract first (CREATE), then integrate (smaller MODIFYs). |

### The Golden Rule

**The pipeline is a code generator, not a code architect.** You decide what to build, which files are involved, and what the output should look like. The pipeline generates the code mechanically, with structural safety guarantees. The better your spec, the better the output.

If you find yourself writing a paragraph-long task description to explain what you want -- that's a sign you should break the task into smaller pieces.

---

## Prerequisites

No prerequisites. The binary is standalone -- no Node.js, no package manager, no dependencies.

---

## Running Tasks

Throughout this document, commands are shown using `red-exec` as the executable name. Substitute the actual binary for your platform:

| Platform | Command |
|---|---|
| Windows | `.\red-exec-win-x64.exe` |
| Linux | `./red-exec-linux-x64` |
| macOS | `./red-exec-macos-x64` |

### Basic task execution

```bash
red-exec "<task description>" --files <comma-separated-paths>
```

Examples:

```bash
# Single file
red-exec "Add health endpoint" --files src/server.js

# Multiple files
red-exec "Split runner into modules" --files lib/runner.js,lib/setup.js,lib/execution.js

# With a different model
red-exec "Refactor into modules" --files lib/runner.js --model gpt-4.1-mini

# Dry run (works on a temp copy, originals untouched)
red-exec "Add logging" --files src/app.js --dry-run

# Disable safety gate
red-exec "Rewrite exports" --files lib/api.js --no-gate

# Generate a run report (.red-exec-report.md)
red-exec "Add caching" --files src/cache.js --report
```

---

## Running Benchmarks

There are two ways to run benchmarks:

### Path 1: Via the binary (quick, red-exec only)

The binary has benchmarks built in. No extra setup needed:

```bash
# Multi-file benchmark (3 fixtures, 44 checks)
red-exec --benchmark multifile

# Single fixture
red-exec --benchmark multifile --task module-split

# Polyglot benchmark (49 exercises)
red-exec --benchmark polyglot

# Single exercise
red-exec --benchmark polyglot --exercise bowling
```

### Path 2: Via the benchmark folder (any agent)

The `benchmarks/` folder is a standalone, agent-agnostic test suite. Use this to benchmark **any** coding agent -- not just red-exec. Requires Node.js 18+ (for Jest test validation).

See `benchmarks/README.md` for full documentation.

```bash
cd benchmarks

# Run multi-file benchmark with red-exec
npm run multifile -- --harness ./harnesses/red-exec-direct.js --all

# Run with Claude Code instead
npm run multifile -- --harness ./harnesses/claude-code.js --all

# Run with your own agent
npm run multifile -- --harness ./harnesses/my-agent.js --all
```

**Writing your own harness** -- a harness is a single `.js` file that receives a workspace directory and runs your agent:

```javascript
// harnesses/my-agent.js
const { execSync } = require('child_process');
const fs = require('fs');

const dir = process.argv[2];
const task = fs.readFileSync(dir + '/TASK.md', 'utf8');
const files = fs.readFileSync(dir + '/FILES.txt', 'utf8').trim().split('\n').join(' ');

execSync(`my-agent ${JSON.stringify(task)} --files ${files}`, { cwd: dir, stdio: 'inherit' });
```

That's the entire contract. The runner handles setup, scoring, timing, and results.

### Expected output

```
Multifile benchmark — 3 fixture(s)
Timeout: 600s

[module-split] 20/20 checks passed
[pipeline-skeleton] 11/11 checks passed
[tool-migration] 13/13 checks passed

──────────────────────────────────────────────────
Fixtures: 3
Checks:   44/44 passed (100.0%)
Tokens:   20,694t total (12 LLM calls)
```

---

## Writing Good Task Descriptions

The task description is plain English -- no JSON, no schema, no special format. The pipeline parses it internally. But the quality of your description directly determines the quality of the output.

### What works well

**Be specific about what to create or change:**

```bash
red-exec "Create a validation module that exports validate(input), sanitize(input), and RULES object" --files src/validation.js
```

**Name the functions, exports, and patterns you want:**

```bash
red-exec "Split the database layer from app.js into db.js (connection, pool) and queries.js (getUser, createUser, deleteUser)" --files app.js,db.js,queries.js
```

**Specify the file list carefully.** The pipeline only sees files you pass to `--files`. It cannot discover files on its own.

```bash
# Good: all involved files listed
red-exec "Move SQL queries from server.js into queries.js, update server.js imports" --files server.js,queries.js

# Bad: missing the file that needs updating
red-exec "Move SQL queries into queries.js" --files queries.js
```

### What doesn't work

**Vague or exploratory instructions:**

```bash
# Bad: no concrete spec
red-exec "Make this faster" --files src/app.js
red-exec "Improve error handling" --files lib/server.js
red-exec "Clean up this code" --files src/utils.js
```

**Tasks that require understanding code you didn't provide:**

```bash
# Bad: pipeline can't read files not in --files
red-exec "Update all callers of getUser()" --files src/db.js
```

### Tips

- One task, one run. Don't combine unrelated changes.
- If you're describing more than 2-3 sentences of instructions, break the task into smaller runs.
- For MODIFY tasks on existing files, the files must exist at the paths you specify.
- For CREATE tasks, the files will be created at the paths you specify.
- Use `--dry-run` to preview changes without modifying your files.

---

## Diagnostics & Reporting

Every run produces a structured pipeline report covering each stage. Use `--report` to write a detailed markdown file.

### Console report (always printed)

After every task execution, the CLI prints a summary:

```
=== Run Report ===
Status:   OK
Stages:   L1 ✓  L2 ✓  L3 ✓  Gate ✓
Files:    3 written, 2 deleted, 0 blocked
Tokens:   9,126 (7 calls, 124.0s)
```

Status values:
- **OK** — all stages passed, all files written
- **PARTIAL** — syntax errors or InvariantGate blocked one or more files
- **CRASHED** — pipeline threw an unrecoverable error

### Detailed report (`--report`)

```bash
red-exec "Migrate tools" --files src/tools/*.js --report
```

Writes `.red-exec-report.md` to the workspace with:

| Section | Contents |
|---|---|
| Stages table | Per-stage status: L1 Decompose, L2 Section, L3 Execute, Gate |
| L1 Actions | What the pipeline decided to do: CREATE, MODIFY, EXTRACT, DELETE per file |
| Syntax Errors | Any L3-generated files that failed `node --check` |
| Invariant Violations | Gate-detected issues (removed exports, out-of-scope writes) |
| Blocked Files | Files the gate refused to write, with reasons |
| Written Files | Files successfully written to disk |
| Suggested Action | Actionable next step when status is not OK |
| Token Usage | Prompt/completion/total tokens and LLM call count |

### Interpreting failures

When a run shows **PARTIAL** status:

1. **Syntax errors** — L3 generated code that doesn't parse. Retry usually fixes this (LLM sampling variance). Try `--max-retries 2` or a different model (`--model gpt-4.1-mini`).
2. **Gate blocked files** — InvariantGate prevented a destructive write (e.g., removing an exported function). Check `.red-exec-report.md` for the specific violation. If the write was intentional, use `--no-gate` or adjust the task spec.
3. **Missing imports** — Generated files may reference symbols from other files without importing them. This is the most common cross-module issue. Skill files can guide the LLM on required imports.

### Debug export (`--export-debug`)

If a run fails or produces unexpected output, export a debug bundle for analysis:

```bash
red-exec "Add caching" --files src/cache.js --export-debug
```

This produces a `.zip` file containing the run metadata, full event log, LLM prompts/responses, and generated file contents. You can also export from a previous run using `--run-id`:

```bash
red-exec --export-debug --run-id <run-id>
```

On pipeline errors, the debug bundle is exported automatically.

### Benchmark diagnostics

The multifile benchmark harness prints the pipeline report for each fixture, so you can see per-fixture stage status alongside the check results:

```
[tool-migration] 13/13 checks passed
=== Run Report ===
Status:   OK
Stages:   L1 ✓  L2 ✓  L3 ✓  Gate ✓
Files:    3 written, 2 deleted, 0 blocked
Tokens:   9,126 (7 calls, 124.0s)
```

---

## CLI Reference

```
red-exec v0.1.0-alpha  Structured code generation pipeline

USAGE:
    red-exec "<task>" --files <paths>           Run a task
    red-exec --benchmark polyglot               Run polyglot benchmark (49 exercises)
    red-exec --benchmark multifile              Run multi-file benchmark (3 fixtures)
    red-exec --score --workspace <d> --checks <f>   Score results
    red-exec --compare                          Compare to baselines

OPTIONS:
    --files <paths>          Comma-separated file paths to modify
    --model <name>           LLM model (default: deepseek-chat)
    --no-gate                Disable InvariantGate safety checks
    --dry-run                Run in temp copy, preserve originals
    --report                 Write .red-exec-report.md to workspace
    --harness <path>         Agent harness for benchmarks
    --exercise <name>        Single polyglot exercise
    --task <name>            Single multi-file fixture
    --max-retries <n>        Fresh retries on failure (default: 2)
    --export-debug           Export debug bundle (zip) for the run
    --run-id <id>            Run ID for retroactive --export-debug
    --version                Print version
    --help                   Print this help

ENVIRONMENT:
    DEEPSEEK_API_KEY         Required for deepseek-chat (default model)
    OPENAI_API_KEY           Required for gpt-4.1-mini, gpt-4.1, gpt-5.2
    LLM_MODEL                Override default model
```

### Logs

Run logs are written to `.red-exec-logs/` in your current working directory.

---

## Supported Models

| Model | Adapter | Env var required |
|---|---|---|
| `deepseek-chat` (default) | DeepSeek | `DEEPSEEK_API_KEY` |
| `deepseek-reasoner` | DeepSeek | `DEEPSEEK_API_KEY` |
| `gpt-4.1` | OpenAI | `OPENAI_API_KEY` |
| `gpt-4.1-mini` | OpenAI | `OPENAI_API_KEY` |
| `gpt-4o` | OpenAI | `OPENAI_API_KEY` |
| `gpt-4o-mini` | OpenAI | `OPENAI_API_KEY` |

---

## Benchmark Results (April 2026)

### Multi-file: public benchmark suite (reproducible)

7 consecutive runs with `--max-retries 0` (no retries):

| Run | Pass Rate | Tokens | LLM Calls |
|---|---|---|---|
| 1 | 44/44 (100%) | 22,934t | 13 |
| 2 | 44/44 (100%) | 21,538t | 12 |
| 3 | 44/44 (100%) | 22,968t | 12 |
| 4 | 44/44 (100%) | 19,869t | 11 |
| 5 | 44/44 (100%) | 23,580t | 13 |
| 6 | 44/44 (100%) | 21,787t | 12 |
| 7 | 44/44 (100%) | 20,694t | 12 |

Per-fixture averages: module-split ~3.8K (1 call), pipeline-skeleton ~6.8K (3 calls), tool-migration ~10.3K (8 calls).

### Multi-file: red-exec vs Claude Code (public benchmarks)

| Task | red-exec (deepseek-chat) | Claude Code (Sonnet) | Ratio |
|---|---|---|---|
| Module split (20 checks) | 3.9K | 90K | **23x cheaper** |
| Pipeline skeleton (11 checks) | 6.5K | 191K | **29x cheaper** |
| Tool migration (13 checks) | 10.3K | 163K | **16x cheaper** |
| **Total** | **21K** | **444K** | **21x cheaper** |

### Multi-file: internal production codebase (not reproducible externally)

| Task | red-exec (deepseek-chat) | Claude Code (Sonnet) | Ratio |
|---|---|---|---|
| Pipeline split (937-line file, 12 checks) | 10.4K | 473K | **45x cheaper** |
| Tool migration (7 files, 13 checks) | 44K | 547K | **12x cheaper** |
| Pipeline skeleton (11 checks) | 16.2K | 787K | **49x cheaper** |

The gap widens on production code because larger codebases amplify context accumulation in agentic loops while the structured pipeline stays bounded. Public benchmarks are the verifiable floor.

### Polyglot (49 JavaScript exercises)

| | red-exec | Cline (agentic loop) |
|---|---|---|
| Pass rate | 49/49 (100%) | 49/49 (100%) |
| Total tokens | 689K | 10,287K |
| Cost ratio | **1x** | **14.9x** |

---

## Troubleshooting

**"DEEPSEEK_API_KEY is not set"** -- The environment variable is not visible to the binary. On Windows, make sure you set it in the same PowerShell session (or added it to system env vars and opened a new terminal). On Linux/macOS, make sure you `export` it (not just `DEEPSEEK_API_KEY=...` without `export`).

**"Permission denied" (Linux/macOS)** -- Run `chmod +x ./red-exec-linux-x64` (or the macOS binary) first.

**"This app can't run on your PC" (Windows)** -- You may be on an ARM64 Windows device. The provided binary is x64 only. Run it under x64 emulation.

**macOS Gatekeeper warning** -- macOS may block unsigned binaries. To allow it:

```bash
xattr -d com.apple.quarantine ./red-exec-macos-x64
```

**Antivirus flags the binary** -- `pkg`-compiled Node.js binaries are sometimes flagged by antivirus software as false positives because they contain a bundled runtime. Add an exception for the binary.

**Pipeline returns PARTIAL or CRASHED** -- See [Interpreting failures](#interpreting-failures) above. Most common fix: retry with `--max-retries 2` or try a different model (`--model gpt-4.1-mini`).

---

## Other Documents

| File | Audience | Content |
|---|---|---|
| `ALPHA-NOTES.md` | Co-architects / testers | What works, what doesn't, design decisions to challenge |
| `PHILOSOPHY.md` | Technical readers | "Constrained Attention Is What You Need" -- the architectural thesis |
| `INVESTOR-BRIEF.md` | Business / investors | Market problem, proof points, unit economics, defensibility |
