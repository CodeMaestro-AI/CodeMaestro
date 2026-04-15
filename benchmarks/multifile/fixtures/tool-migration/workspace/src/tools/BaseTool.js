'use strict';

class BaseTool {
  constructor(name) {
    if (!name) throw new Error('Tool name is required');
    this._name = name;
  }

  // Subclasses must override
  async execute(args) {
    throw new Error(`${this._name}.execute() not implemented`);
  }

  getName() {
    return this._name;
  }

  getDescription() {
    return '';
  }

  getSchema() {
    return {};
  }
}

module.exports = { BaseTool };
