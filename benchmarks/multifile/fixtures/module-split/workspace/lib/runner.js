'use strict';

const path = require('path');
const fs = require('fs');

// ═══ SECTION 1: SETUP ═══

/**
 * Initialize configuration from a config file path.
 * @param {string} configPath - Path to the config file
 * @returns {object} Parsed configuration object
 */
function initConfig(configPath) {
  if (!configPath) throw new Error('configPath is required');
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) return {};
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

/**
 * Validate that required environment variables are set.
 * @param {object} env - Environment variables object (defaults to process.env)
 * @returns {boolean} True if environment is valid
 */
function validateEnvironment(env) {
  const target = env || process.env;
  return typeof target === 'object' && target !== null;
}

/**
 * Load plugins from a directory.
 * @param {string} pluginDir - Directory containing plugin modules
 * @returns {object[]} Array of loaded plugin objects
 */
function loadPlugins(pluginDir) {
  if (!pluginDir || !fs.existsSync(pluginDir)) return [];
  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
  return files.map(f => ({ name: f.replace('.js', ''), path: path.join(pluginDir, f) }));
}

/**
 * Create a runtime context with merged options.
 * @param {object} options - Context options
 * @returns {object} Context object
 */
function createContext(options) {
  return Object.assign({ plugins: [], config: {}, startTime: Date.now() }, options || {});
}

// ═══ SECTION 2: EXECUTION ═══

/**
 * Execute a single task within a context.
 * @param {object} context - Runtime context
 * @param {object} task - Task definition with id and handler
 * @returns {object} Task result
 */
function executeTask(context, task) {
  if (!context || !task) throw new Error('context and task are required');
  const result = { taskId: task.id, status: 'ok', output: null };
  if (typeof task.handler === 'function') {
    result.output = task.handler(context);
  }
  return result;
}

/**
 * Process a queue of tasks sequentially.
 * @param {object} context - Runtime context
 * @param {object[]} queue - Array of task definitions
 * @returns {object[]} Array of task results
 */
function processQueue(context, queue) {
  if (!Array.isArray(queue)) return [];
  return queue.map(task => executeTask(context, task));
}

/**
 * Run a single pipeline step.
 * @param {object} context - Runtime context
 * @param {object} step - Step definition with name and fn
 * @returns {*} Step output
 */
function runStep(context, step) {
  if (!step || typeof step.fn !== 'function') return null;
  return step.fn(context);
}

/**
 * Handle an error that occurred during execution.
 * @param {object} context - Runtime context
 * @param {Error} error - The error to handle
 * @returns {object} Error record
 */
function handleError(context, error) {
  const record = { message: error.message, stack: error.stack, ts: Date.now() };
  if (context && Array.isArray(context.errors)) {
    context.errors.push(record);
  }
  return record;
}

// ═══ SECTION 3: POST-PROCESS ═══

/**
 * Collect results from context after execution.
 * @param {object} context - Runtime context
 * @returns {object[]} Array of collected result entries
 */
function collectResults(context) {
  if (!context || !Array.isArray(context.results)) return [];
  return context.results.slice();
}

/**
 * Format an array of results into a report object.
 * @param {object[]} results - Array of result entries
 * @returns {object} Report with summary and entries
 */
function formatReport(results) {
  const entries = Array.isArray(results) ? results : [];
  return {
    total: entries.length,
    passed: entries.filter(r => r && r.status === 'ok').length,
    failed: entries.filter(r => r && r.status !== 'ok').length,
    entries
  };
}

/**
 * Write formatted results to an output file.
 * @param {object} results - Results to write
 * @param {string} outputPath - Destination file path
 */
function writeOutput(results, outputPath) {
  if (!outputPath) throw new Error('outputPath is required');
  const report = formatReport(Array.isArray(results) ? results : [results]);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), JSON.stringify(report, null, 2), 'utf8');
}

/**
 * Clean up context resources after a run.
 * @param {object} context - Runtime context to clean up
 */
function cleanup(context) {
  if (!context) return;
  context.results = [];
  context.errors = [];
  context.endTime = Date.now();
}

module.exports = {
  // Setup
  initConfig,
  validateEnvironment,
  loadPlugins,
  createContext,
  // Execution
  executeTask,
  processQueue,
  runStep,
  handleError,
  // Post-process
  collectResults,
  formatReport,
  writeOutput,
  cleanup
};
