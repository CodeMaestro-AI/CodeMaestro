'use strict';

const { BaseTool } = require('./BaseTool');

class PatchTool extends BaseTool {
  constructor(options = {}) {
    super('PatchTool');
    this.options = options;
  }

  async execute(args) {
    // stub
    return { success: false };
  }

  getName() {
    return 'PatchTool';
  }

  getDescription() {
    return 'Applies patches to files using line numbers and text anchors';
  }

  getSchema() {
    return 'path:string, start:number, until:number, block:string';
  }
}

module.exports = { PatchTool };
