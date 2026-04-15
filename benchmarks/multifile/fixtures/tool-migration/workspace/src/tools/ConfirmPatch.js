'use strict';

const { BaseTool } = require('./BaseTool');

class ConfirmPatch extends BaseTool {
  constructor(options = {}) {
    super('ConfirmPatch');
    this.options = options;
  }

  async execute(args) {
    // stub
    return { confirmed: false };
  }

  getName() {
    return 'ConfirmPatch';
  }

  getDescription() {
    return 'Confirms a pending patch operation before it is applied';
  }

  getSchema() {
    return 'confirm:boolean';
  }
}

module.exports = { ConfirmPatch };
