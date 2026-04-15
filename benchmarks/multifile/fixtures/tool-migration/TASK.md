# Task: Migrate Patch Tools to SearchReplaceTool

The current file-patching system uses two tools: `PatchTool` (applies patches by line number) and `ConfirmPatch` (confirms pending patches). This two-step approach is fragile -- line numbers drift after earlier edits, and the confirmation flow adds unnecessary complexity.

Replace both tools with a single `SearchReplaceTool` that matches by content rather than line number.

---

## What to do

### 1. Create `src/tools/SearchReplaceTool.js`

A new tool class extending `BaseTool`:

```javascript
class SearchReplaceTool extends BaseTool {
  constructor(options = {})
  async execute({ path, search, replace, search_start_line })
  getName()
  getDescription()
  getSchema()
}
module.exports = { SearchReplaceTool };
```

The `execute` method should:
1. Read the file at `path`.
2. Find the `search` string in the file content.
3. Replace it with `replace`.
4. Write the file and return `{ success: true }`.
5. If not found, return `{ success: false, error: 'search string not found' }`.

Use `search_start_line` (optional) as a hint when there are multiple matches -- pick the match closest to that line number.

Export the class via `module.exports = { SearchReplaceTool }`.

### 2. Update `src/tools/PatchFile.js`

Remove the two-step patch flow:
- Remove the `hasPendingPatch()` method
- Remove the `confirm()` method
- Remove the `_pendingPatch` state from the constructor

Update `execute()` to directly apply the patch using `SearchReplaceTool`.

### 3. Delete `src/tools/PatchTool.js`

This file is no longer needed. Delete it.

### 4. Delete `src/tools/ConfirmPatch.js`

This file is no longer needed. Delete it.

### 5. Update `src/capabilities/index.js`

- Remove the `PatchTool` import and export
- Remove the `ConfirmPatch` import and export
- Add the `SearchReplaceTool` import and export

---

## Constraints

- Do NOT modify `src/tools/BaseTool.js`.
- All `.js` files you create or modify must pass `node --check` (no syntax errors).
- `SearchReplaceTool` must extend `BaseTool`.
