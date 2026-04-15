# System Contract

Every pipeline system in this workspace follows a common structural convention. This document defines that convention.

---

## Directory Layout

Each system lives under `systems/core/<system-name>/` and must contain:

```
systems/core/<system-name>/
  <system-name>.xml        # System manifest (required)
  index.js                 # Entry point (required)
  agents/
    default.json           # Default agent configuration (required)
  lib/                     # Internal modules (optional)
```

---

## 1. XML Manifest (`<system-name>.xml`)

Describes the system's stages, agent references, and per-stage config.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<system name="<system-name>" version="1.0">
  <description>Human-readable description.</description>

  <stages>
    <stage id="STAGE_ID" order="1">
      <description>What this stage does.</description>
      <agent ref="default" />
      <config>
        <timeout>30000</timeout>
        <retries>2</retries>
      </config>
    </stage>
  </stages>

  <agents>
    <agent id="default" config="agents/default.json" />
  </agents>

  <outputs>
    <evidence type="result_type" description="What the system produces." />
  </outputs>
</system>
```

**Rules:**
- `<system name>` must match the directory name.
- Each `<stage>` must have a unique `id` and sequential `order`.
- `<agent ref>` must correspond to an `id` in the `<agents>` block.

---

## 2. Entry Point (`index.js`)

Must export a `runStage` function using CommonJS (`module.exports`).

```js
'use strict';

async function runStage(stage, context, options = {}) {
  // stage:   string — the stage ID from the XML manifest
  // context: object — shared evidence pool; read inputs, write outputs
  // options: object — optional runtime overrides
  //
  // Returns: object — the stage result (also written to context)
}

module.exports = { runStage };
```

**Rules:**
- Must use `module.exports`, not ES module `export`.
- `runStage` must be an async function.
- Unknown stage IDs should throw an `Error`.
- The function may load `<system-name>.xml` from `__dirname` for config.

---

## 3. Agent Configuration (`agents/default.json`)

JSON file describing the default model settings for this system.

```json
{
  "name": "<system-name>-default",
  "model": "<model-id>",
  "temperature": 0.2,
  "maxTokens": 1024
}
```

**Rules:**
- Must be valid JSON.
- Required fields: `name`, `model`, `temperature`, `maxTokens`.

---

## 4. Pipeline State Machine (`lib/pipelineMachine.js`) — optional but recommended for multi-stage systems

For systems with more than two stages, orchestrate stage transitions with an xstate v5 state machine.

```js
'use strict';

const { createMachine } = require('xstate');

const pipelineMachine = createMachine({
  id: '<system-name>-pipeline',
  initial: 'firstStage',
  context: { /* shared state */ },
  states: {
    firstStage: { /* ... */ },
    // ...
    complete: { type: 'final' },
    failed:   { type: 'final' },
  },
});

module.exports = { pipelineMachine };
```

**Rules:**
- Must export the machine or a factory function as `module.exports`.
- Must define `complete` and `failed` as final states.
- Actor services should be stubs unless real logic is needed.
