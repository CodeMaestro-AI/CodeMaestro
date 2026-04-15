# red-exec Alpha Notes -- For Co-Architects

**Version:** 0.1.0-alpha
**Date:** April 2026
**Engine:** Structured execution pipeline (Architectural Intent > Contextual Sectioning > Unit Generation > Invariant Audit)

You are not just testing software. You are evaluating an architectural thesis: that **structured pipelines** produce more reliable, more efficient code than **open-ended agentic loops**.

This document tells you what we know, what we don't know, and where your judgment matters more than ours.

---

## What We Are Confident In

These are proven across hundreds of runs. If you see failures here, something unexpected is happening -- and we want to hear about it.

**Correctness is solved for single-file tasks.**
49/49 Exercism JavaScript exercises pass (100%). The pipeline handles string manipulation, graph algorithms, reactive programming, constraint solving, parsers, math, state machines, and game logic. This is the same pass rate as Cline (agentic loop) on the same exercises with the same LLM.

**Cost efficiency is structural, not accidental.**
The pipeline uses 14.9x fewer tokens than an agentic loop on average, with a range of 3.2x (bowling) to 71.1x (wordy). This is not prompt tuning -- it is architecture. Each stage receives only what it needs. There is no chat history accumulation, no self-destructive optimization loops, no context window bloat.

| | red-exec | Cline (agentic loop) | Ratio |
|---|---|---|---|
| Pass rate (49 exercises) | 49/49 (100%) | 49/49 (100%) | Equal |
| Total tokens | 689K | 10,287K | **14.9x cheaper** |
| Wall time | 77 min | 86 min | 1.12x faster |
| API calls | 452 | 637 | 1.4x fewer |

**Multi-file coordination works -- and the cost gap widens.**
The pipeline creates, modifies, and wires together multiple files in a single run. Three multi-file benchmarks (tool migration, module split, pipeline skeleton) covering 44 behavioral checks -- compile, export, runtime behavior -- pass at 100% across 7 consecutive runs without retries (44/44 every run).

**Public benchmark suite (reproducible -- run it yourself):**

| Task | red-exec (deepseek-chat) | Claude Code (Sonnet) | Ratio |
|---|---|---|---|
| Module split (20 checks) | 3.9K | 90K | **23x cheaper** |
| Pipeline skeleton (11 checks) | 6.5K | 191K | **29x cheaper** |
| Tool migration (13 checks) | 10.3K | 163K | **16x cheaper** |
| **Total** | **21K** | **444K** | **21x cheaper** |

Both systems achieved 100% pass rates on all 44 checks. red-exec uses **21x fewer tokens** ($0.003 vs $0.77 per run). Run it yourself: `node bin/red-exec.js --benchmark multifile` and `node bin/red-exec.js --benchmark multifile --harness benchmarks/public/harnesses/claude-code.js`.

**Internal production codebase (not reproducible externally):**

| Task | red-exec | Claude Code (Sonnet) | Ratio |
|---|---|---|---|
| Pipeline split (12 checks, 937-line source) | 10.4K | 473K | **45x cheaper** |
| Tool migration (13 checks, 7 files) | 44K | 547K | **12x cheaper** |
| Pipeline skeleton (11 checks) | 16.2K | 787K | **49x cheaper** |

The gap widens on production code because more files and cross-module complexity means more context accumulation in agentic loops, while the structured pipeline's cost stays bounded. The public benchmarks are the verifiable floor, not the ceiling.

**InvariantGate catches destructive writes.**
Before any file is written to disk, a structural gate checks: is this file in scope? Did we lose any exported functions/classes? If not, the write is blocked and logged. Zero false positives across 49+ exercises.

---

## Where the LLM Has the Last Word

These are behaviors we have quantified but cannot fully control. They stem from LLM sampling variance -- the same prompt, same model, same temperature can produce different code on different runs. We have built mechanical mitigations where possible, but some variance is intrinsic.

**We want your observations:** Do these show up in your use cases? How often? What kinds of tasks trigger them?

### Cross-module interface alignment (now consistent)

When the pipeline creates multiple files that need to call each other, the core logic within each file is consistently excellent. Earlier builds had occasional wiring mismatches -- a method called statically instead of on an instance, an import path that assumed a different directory structure.

**What we measured:** In 7 consecutive runs of the full multifile suite (3 tasks, 44 checks), all 7 achieved 100%. Module-split and tool-migration are 100% consistent with zero failures across all runs. Pipeline-skeleton has rare LLM variance (~1 in 8 runs) but the pass rate is otherwise clean.

**What we built:** Mechanical post-processing passes that deterministically handle cross-module wiring: an EXTRACT-FACADE step that generates re-export modules from extraction metadata (no LLM involved), a post_strip pass that removes banned identifiers, and an extends-import recovery pass that injects missing base-class imports. These mechanical steps eliminated the variance that skill-file-only steering could not fully control.

**What we want to know:** Do you encounter cross-module wiring issues on tasks outside our benchmark suite? The mechanical fixes are scoped to patterns we have observed -- novel integration patterns may still have variance.

### ESM vs. CommonJS flip (~1 in 8 runs)

DeepSeek-chat occasionally uses `export default` instead of `module.exports` despite explicit "CommonJS" instructions in the prompt. When it happens, the generated file will not `require()` correctly.

**What we measured:** Affects `pcc-arc-pipeline-skeleton` roughly 1 in 8 runs. Other benchmarks are unaffected.

**What we built:** Nothing mechanical yet. The InvariantGate could enforce CJS-only output (checking for `export` keywords), but this would block legitimate ESM projects.

**What we want to know:** Is your project CommonJS, ESM, or mixed? Should the gate enforce module format, or should the CLI accept a `--module-format cjs|esm` flag and let you choose?

### Template literal edge cases (rare)

When generated code includes documentation strings or prompt templates inside template literals, the LLM sometimes produces content that breaks JavaScript syntax -- an unescaped backtick, an unexpected identifier inside a template.

**What we measured:** Observed infrequently in pipeline-skeleton runs (~1 in 8 runs). Module-split and tool-migration are unaffected.

**What we built:** The pipeline has a built-in retry mechanism that catches syntax errors and asks the LLM to fix them. This recovers most cases.

**What we want to know:** Does your codebase use heavy template literal patterns? If so, we may need to prioritize a syntax-aware post-processing pass.

---

## Design Decisions We Want Challenged

These are deliberate architectural choices. We believe they are correct, but we chose them from the inside. You are seeing the system from the outside. Tell us where we are wrong.

### 1. Fixed pipeline vs. adaptive depth

The pipeline always runs Intent > Sectioning > Generation, regardless of task complexity. A one-line change runs the same 3-phase process as a 500-line feature. This makes behavior predictable and cost bounded -- but it might be overkill for simple tasks and insufficient for truly complex ones.

**The tradeoff:** Predictability and cost ceiling vs. optimality per task.

**Challenge us:** After using the pipeline on 10+ tasks, do you feel like simple tasks are over-processed? Do complex tasks feel under-processed? Should the pipeline be able to skip stages for trivial changes, or add intermediate steps for complex ones?

### 2. Blocking gate vs. advisory gate

InvariantGate currently **blocks** file writes that fail structural checks. The file is not written, and a violation is logged. There is no "write it anyway" option (except `--no-gate`).

**The tradeoff:** Safety guarantee vs. user frustration when the gate is wrong.

**Challenge us:** Have you been blocked by the gate on a write you knew was correct? How often? Would you prefer a `--gate=warn` mode that writes the file but logs a warning?

### 3. Skill files as task-specific guidance

Some benchmarks ship with a `.md` skill file that gives the LLM additional context -- architectural patterns to follow, identifiers to avoid, integration conventions. Without these, the LLM still produces working code, but with slightly lower consistency.

**The tradeoff:** Task-specific tuning vs. zero-config experience.

**Challenge us:** Should `red-exec` work well *without* any skill file (the default), with skill files as a power-user optimization? Or should the CLI help users create skill files (e.g., `red-exec --init-skill`) as part of the standard workflow?

### 4. Single LLM, single pass per section

Each code section is generated by one LLM call. If the output has issues, the pipeline retries up to 2 times. We do not ensemble multiple models, do not do majority voting, and do not iteratively refine beyond automatic retries.

**The tradeoff:** Cost and speed vs. maximum quality ceiling.

**Challenge us:** Would you pay 2-3x the token cost for a "high quality" mode that fills each slot twice and picks the better output? Or is the current single-pass quality (7/10 production-ready, 9/10 for core logic) sufficient?

---

## How to Report What You Find

We are not looking for bug reports in the traditional sense. We are looking for **signal** -- patterns in how the pipeline behaves on real tasks that we cannot see from benchmark data alone.

The most valuable things you can tell us:

1. **"The pipeline generated X, but I expected Y"** -- show us generated code vs. what you wanted. This helps us tune prompts and skill file templates.

2. **"I had to fix Z every time"** -- recurring patterns you manually correct. These are candidates for mechanical post-processing.

3. **"The gate blocked my file and it should not have"** -- false positives in InvariantGate. Include the violation log entry (`.red-exec-violations.jsonl`).

4. **"This task type always/never works"** -- helps us understand the pipeline's true capability boundary. We know it handles: refactoring, feature addition, tool migration, module splitting. We do not yet know how it handles: performance optimization, test generation, framework migrations.

5. **Your honest reaction to the output quality** -- is this code you would commit? Code you would review then commit? Code you would rewrite from scratch? The answer calibrates our "production-ready" rating.

---

## What Is Next (and Where Your Input Shapes It)

| Decision | Options | Your input changes the answer |
|---|---|---|
| Module format enforcement | Gate-enforced CJS vs. CLI flag vs. auto-detect | Depends on what module systems alpha testers actually use |
| Skill file workflow | Zero-config default vs. `--init-skill` wizard | Depends on whether testers find skill files useful or annoying |
| Quality vs. cost slider | Single-pass only vs. optional "high quality" mode | Depends on what testers value more -- speed or polish |
| Interface enforcement | Mechanical contract checking vs. human review | Depends on how much cross-module wiring variance testers actually hit |
| Language support | JavaScript-only (current) vs. Python next vs. TypeScript next | Depends on what testers want to use it for |

Your usage data and opinions on these five questions directly determine the post-alpha roadmap. We are not asking you to vote on features -- we are asking you to use the tool and tell us what matters.

---

*This document will be updated as alpha feedback comes in. Every design decision above is open for revision based on real-world signal.*
