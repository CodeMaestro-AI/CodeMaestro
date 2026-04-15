# Task: Split runner.js into Focused Modules

The file `lib/runner.js` currently contains three logical sections in a single file:
- **SECTION 1: SETUP** — config loading, environment validation, plugin loading, context creation
- **SECTION 2: EXECUTION** — task execution, queue processing, step running, error handling
- **SECTION 3: POST-PROCESS** — result collection, report formatting, output writing, cleanup

## What to do

Split `lib/runner.js` into three focused modules:

### 1. CREATE `lib/setup.js`

Move the SETUP section functions here. Export all four:
- `initConfig(configPath)`
- `validateEnvironment(env)`
- `loadPlugins(pluginDir)`
- `createContext(options)`

### 2. CREATE `lib/execution.js`

Move the EXECUTION section functions here. Export all four:
- `executeTask(context, task)`
- `processQueue(context, queue)`
- `runStep(context, step)`
- `handleError(context, error)`

### 3. CREATE `lib/postProcess.js`

Move the POST-PROCESS section functions here. Export all four:
- `collectResults(context)`
- `formatReport(results)`
- `writeOutput(results, outputPath)`
- `cleanup(context)`

## Constraints

- All existing function signatures and implementations must be preserved exactly
- `lib/runner.js` may be kept or deleted — do not break anything that imports from it
- Each new file must use CommonJS (`require` / `module.exports`)
- All new files must load without errors (`node -e "require('./lib/setup.js')"`)
- Run `npm test` to verify the workspace is consistent after your changes
