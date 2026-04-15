# Fixture: pipeline-skeleton

**Type:** CREATE (multi-file)
**Difficulty:** Medium
**Checks:** 11

## What This Tests

The agent's ability to follow an established structural convention when creating a new system from scratch. There are no existing files to modify — everything is a net-new creation.

The workspace contains a reference implementation (`systems/core/triage/`) and a convention document (`docs/SYSTEM_CONTRACT.md`). The agent must read these, understand the pattern, and reproduce it for a new system (`pcc-arc`).

## Workspace Contents

```
workspace/
  package.json                          # Project deps (xstate included)
  docs/
    SYSTEM_CONTRACT.md                  # Convention reference
  systems/core/
    triage/                             # Reference implementation
      triage.xml
      index.js
      agents/default.json
```

## Expected Output

```
systems/core/pcc-arc/
  pcc-arc.xml
  index.js
  agents/default.json
  lib/
    pipelineMachine.js
```

## Scoring

11 checks across two tiers:

- **Tier 1 (7 checks):** All four files exist; index.js and pipelineMachine.js compile; agents/default.json is valid JSON.
- **Tier 2 (4 checks):** index.js exports `runStage`; pcc-arc.xml contains a `PLAN` stage; pipelineMachine.js exports `pipelineMachine`; package.json lists `xstate`.
