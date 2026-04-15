# Fixture: tool-migration

**Type:** MODIFY + DELETE + CREATE (multi-file)
**Difficulty:** Medium
**Checks:** 13

## What This Tests

The agent's ability to perform a tool consolidation refactor: replace two old tools (`PatchTool`, `ConfirmPatch`) with a single new tool (`SearchReplaceTool`), update a dependent class (`PatchFile`), and rewire the module exports.

This tests:
- Creating a new class that extends an existing base class
- Deleting files that are no longer needed
- Modifying an existing class to remove deprecated methods
- Updating module re-exports to reflect the new API surface

## Workspace Contents

```
workspace/
  package.json
  src/
    tools/
      BaseTool.js          # Base class (do not modify)
      PatchTool.js         # To be deleted
      ConfirmPatch.js      # To be deleted
      PatchFile.js         # To be updated (remove hasPendingPatch, confirm)
    capabilities/
      index.js             # To be updated (swap PatchTool/ConfirmPatch for SearchReplaceTool)
```

## Expected Output

```
src/tools/SearchReplaceTool.js    # Created
src/tools/PatchFile.js            # Modified (no hasPendingPatch/confirm)
src/tools/PatchTool.js            # Deleted
src/tools/ConfirmPatch.js         # Deleted
src/capabilities/index.js         # Modified (exports SearchReplaceTool)
```

## Scoring

13 checks across three tiers:

- **Tier 1 (5 checks):** SearchReplaceTool.js exists; SearchReplaceTool.js and PatchFile.js compile; PatchFile.js still exists; capabilities/index.js compiles.
- **Tier 2 (5 checks):** SearchReplaceTool exports the class; PatchTool.js deleted; ConfirmPatch.js deleted; PatchFile.js has no `hasPendingPatch`; capabilities/index.js references SearchReplaceTool.
- **Tier 3 (3 checks):** capabilities/index.js has no PatchTool or ConfirmPatch references; SearchReplaceTool has an execute method.
