# Fixture: module-split

**Category:** multifile
**Type:** EXTRACT + MODIFY
**Difficulty:** medium

## Description

A monolithic `lib/runner.js` module contains three clearly-marked logical sections
(SETUP, EXECUTION, POST-PROCESS). The task is to split it into three focused modules
(`setup.js`, `execution.js`, `postProcess.js`) and update two dependent files
(`config.js`, `main.js`) to import from the new modules instead of `runner.js`.

## What the agent must do

1. Create `lib/setup.js` — exports 4 setup functions
2. Create `lib/execution.js` — exports 4 execution functions
3. Create `lib/postProcess.js` — exports 4 post-processing functions
4. Update `lib/config.js` — change import source from `./runner` to `./setup`
5. Update `lib/main.js` — change import sources from `./runner` to `./execution` / `./setup`

## Scoring

22 checks total:
- 3 `file_exists` checks (one per new module)
- 3 `runtime_load` checks (new modules must compile)
- 12 `runtime_exports` checks (4 exports per new module, typed as `function`)
- 2 `content_match` checks (config.js imports `./setup`, main.js imports `./execution`)
- 2 `file_exists` + `runtime_load` checks confirming runner.js still compiles

## Workspace layout

```
workspace/
  lib/
    runner.js        <-- source module with three sections (do not break)
    config.js        <-- imports from runner, must be updated to ./setup
    main.js          <-- imports from runner, must be updated to ./execution
  test/
    runner.test.js   <-- verifies all 12 exports exist on runner.js
  package.json
```

## Running the fixture test

```bash
cd workspace
npm test
```
