'use strict';

const { executeTask, processQueue, createContext } = require('./runner');

/**
 * Run a list of tasks using a fresh context.
 * @param {object[]} tasks - Array of task definitions
 * @param {object} [options] - Context options
 * @returns {object} Run summary with context and results
 */
function run(tasks, options) {
  const context = createContext(Object.assign({ results: [], errors: [] }, options || {}));
  const results = processQueue(context, Array.isArray(tasks) ? tasks : []);
  context.results = results;
  return { context, results };
}

module.exports = { run };
