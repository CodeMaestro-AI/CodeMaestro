'use strict';

const { initConfig, validateEnvironment } = require('./runner');

/**
 * Configure the application by loading config and validating environment.
 * @param {string} configPath - Path to config file
 * @param {object} [env] - Environment variables (defaults to process.env)
 * @returns {object} Configuration result
 */
function configure(configPath, env) {
  if (!validateEnvironment(env)) {
    throw new Error('Invalid environment');
  }
  const config = initConfig(configPath);
  return { config, env: env || process.env };
}

module.exports = { configure };
