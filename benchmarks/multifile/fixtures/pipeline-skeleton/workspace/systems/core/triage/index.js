'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load the XML config for this system.
 * Returns the raw XML string; parse it as needed.
 */
function loadConfig() {
  const configPath = path.join(__dirname, 'triage.xml');
  return fs.readFileSync(configPath, 'utf8');
}

/**
 * Run a single stage of the triage pipeline.
 *
 * @param {string} stage         - Stage ID (e.g. "CLASSIFY", "ROUTE")
 * @param {object} context       - Shared pipeline context / evidence pool
 * @param {object} [options]     - Optional overrides (timeout, retries, etc.)
 * @returns {Promise<object>}    - Stage result written back to context
 */
async function runStage(stage, context, options = {}) {
  const config = loadConfig();

  switch (stage) {
    case 'CLASSIFY': {
      // Stub: classify the task in context
      const result = { stage, status: 'ok', classification: 'general', priority: 'normal' };
      context.triage_classification = result;
      return result;
    }

    case 'ROUTE': {
      // Stub: determine target handler
      const classification = context.triage_classification || {};
      const result = { stage, status: 'ok', handler: classification.classification || 'default' };
      context.triage_route = result;
      return result;
    }

    default:
      throw new Error(`Unknown stage: ${stage}`);
  }
}

module.exports = { runStage };
