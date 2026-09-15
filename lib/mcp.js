// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Count configured MCP servers across home and project configurations
 * @param {string} cwd
 * @returns {number}
 */
function getMcpServerCount(cwd) {
  let count = 0;
  const checkedKeys = new Set();

  function scanObj(obj) {
    if (obj && typeof obj.mcpServers === "object") {
      for (const k of Object.keys(obj.mcpServers)) {
        if (!checkedKeys.has(k)) {
          checkedKeys.add(k);
          count++;
        }
      }
    }
  }

  const scanPath = (filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        scanObj(JSON.parse(fs.readFileSync(filePath, "utf8")));
      }
    } catch {
      // Ignore unreadable or malformed JSON
    }
  };

  // 1. Home ~/.claude.json
  scanPath(path.join(os.homedir(), ".claude.json"));

  // 2. Home ~/.claude/settings.json
  scanPath(path.join(os.homedir(), ".claude", "settings.json"));

  // 3. Project .mcp.json
  scanPath(path.join(cwd, ".mcp.json"));

  // 4. Project .claude.json
  scanPath(path.join(cwd, ".claude.json"));

  // 5. Project .claude/settings.json
  scanPath(path.join(cwd, ".claude", "settings.json"));

  return count;
}

module.exports = {
  getMcpServerCount,
};
