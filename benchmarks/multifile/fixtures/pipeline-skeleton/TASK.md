# Task: Create the pcc-arc Pipeline System

Create a new pipeline system called **pcc-arc** following the conventions shown in the existing **triage** system.

Read `docs/SYSTEM_CONTRACT.md` for the full convention, and study the triage system at `systems/core/triage/` as a reference implementation.

---

## Files to Create

### 1. `systems/core/pcc-arc/pcc-arc.xml`

XML manifest for the pcc-arc system. Must include a stage with id `PLAN`.

### 2. `systems/core/pcc-arc/index.js`

Entry point using CommonJS (`module.exports`). Must export a `runStage` function with signature:

```js
async function runStage(stage, context, options = {}) { ... }
```

The function should handle at least the `PLAN` stage and throw for unknown stages.

### 3. `systems/core/pcc-arc/agents/default.json`

Agent configuration JSON with fields: `name`, `model`, `temperature`, `maxTokens`.

### 4. `systems/core/pcc-arc/lib/pipelineMachine.js`

An xstate v5 state machine that orchestrates the pcc-arc pipeline stages. Export it as `pipelineMachine` via `module.exports`.

The machine should include these states (stubs are fine — no real LLM calls):
- `triage` → `fanOut`
- `fanOut` (parallel state with children: `enrich`, `define`, `baseline`) → `verify`
- `verify` → `complete`
- `complete` (final)
- `failed` (final)

Machine context should track at minimum: `task`, `plan`, `error`.

---

## Notes

- All actor services can be stubs that return mock data immediately.
- `xstate` is already listed as a dependency in `package.json`.
- Follow the triage system structure exactly — same layout, same export convention.
