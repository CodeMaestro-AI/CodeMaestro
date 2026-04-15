'use strict';

const { BaseTool } = require('./BaseTool');

class PatchFile extends BaseTool {
  constructor(options = {}) {
    super('PatchFile');
    this.options = options;
    this._pendingPatch = null;
  }

  async execute(args) {
    // stub
    return { applied: false };
  }

  getName() {
    return 'PatchFile';
  }

  getDescription() {
    return 'Applies a patch to a file in the workspace';
  }

  getSchema() {
    return 'path:string, start:number, until:number, block:string, confirm_block:boolean';
  }

  confirm() {
    // stub: confirm the pending patch and apply it
    return false;
  }

  hasPendingPatch() {
    return this._pendingPatch !== null;
  }
}

module.exports = { PatchFile };
