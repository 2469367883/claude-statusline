#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * Claude Code Statusline
 * Zero-dependency, ultra-fast statusline renderer for Claude Code.
 */

const path = require("path");
const {
  DIM,
  CYAN,
  GREEN,
  YELLOW,
  RED,
  MAGENTA,
  RESET,
  THEMES,
  getThemeColors,
  stripAnsi,
  makeProgressBar,
  formatCountdown,
  readLastUsageFromTranscript,
} = require("../lib/utils.js");
const {
  DEFAULT_FIELDS,
  DEFAULT_RATE_LIMIT_WINDOWS,
  GIT_TIMEOUT_MS,
  DEFAULT_CONFIG,
  UI_PRESETS,
  DEFAULT_CONFIG_TEMPLATE,
  parseJsonWithComments,
  loadConfig,
} = require("../lib/config.js");
const { readGitStatus } = require("../lib/git.js");
const { getMcpServerCount } = require("../lib/mcp.js");
const { FIELD_RENDERERS } = require("../lib/renderers.js");

/**
 * Render list of fields into formatted string
 * @param {string[]} fieldList
 * @param {any} context
 * @param {string} delimiter
 * @returns {string}
 */
function renderFieldList(fieldList, context, delimiter) {
  const parts = [];
  for (const fieldName of fieldList) {
    const renderer = FIELD_RENDERERS[fieldName.toLowerCase()];
    if (typeof renderer === "function") {
      const part = renderer(context);
      if (part) {
        parts.push(part);
      }
    }
  }
  return parts.join(delimiter);
}

/**
 * Render the statusline string from session input object
 * @param {any} [input]
 * @param {Partial<import("../lib/config.js").StatuslineConfig>} [customConfig]
 * @returns {string}
 */
function renderStatusline(input = {}, customConfig = {}) {
  const config = { ...loadConfig(), ...customConfig };
  const colors = getThemeColors(config.theme);
  const cwd = input.workspace?.current_dir || input.cwd || process.cwd();
  const project = path.basename(cwd) || cwd || "workspace";

  const iconSets = {
    unicode: {
      model: "✦ ",
      context: "\u26a1 ",
      cache: "\u26a1 ",
      cost: "",
      rate: "\u23f1 ",
      git: "\u2387 ",
      mcp: "\ud83d\udd0c ",
    },
    none: {
      model: "",
      context: "",
      cache: "",
      cost: "",
      rate: "",
      git: "",
      mcp: "",
    },
  };

  const icons = iconSets[config.icons || "none"] || iconSets.none;
  const context = { input, config, icons, colors, cwd, project };

  const rawDelimiter = typeof config.delimiter === "string" ? config.delimiter : "|";
  const delimiter = ` ${colors.DIM}${rawDelimiter.trim()}${colors.RESET} `;

  let result = "";
  const numLines = Number(config.lines);
  if (numLines === 2) {
    let line1Fields = config.line1;
    let line2Fields = config.line2;

    if (!Array.isArray(line1Fields) || !Array.isArray(line2Fields)) {
      const activeFields = Array.isArray(config.fields) ? config.fields : DEFAULT_FIELDS;
      const splitIdx = activeFields.indexOf("project");
      if (splitIdx > 0) {
        line1Fields = activeFields.slice(0, splitIdx);
        line2Fields = activeFields.slice(splitIdx);
      } else {
        const mid = Math.ceil(activeFields.length / 2);
        line1Fields = activeFields.slice(0, mid);
        line2Fields = activeFields.slice(mid);
      }
    }

    const line1Str = renderFieldList(line1Fields, context, delimiter);
    const line2Str = renderFieldList(line2Fields, context, delimiter);

    if (line1Str && line2Str) {
      result = `${line1Str}\n${line2Str}`;
    } else {
      result = line1Str || line2Str || "";
    }
  } else {
    const activeFields = Array.isArray(config.fields) ? config.fields : DEFAULT_FIELDS;
    result = renderFieldList(activeFields, context, delimiter);
  }

  const useColor =
    config.colors !== false &&
    config.colors !== "false" &&
    config.color !== false &&
    config.color !== "false" &&
    !process.env.NO_COLOR;

  if (!useColor) {
    return stripAnsi(result);
  }
  return result;
}

/**
 * Main execution reading from stdin
 */
function run() {
  let raw = "";
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });

  process.stdin.on("end", () => {
    let input = {};
    try {
      input = JSON.parse(raw || "{}");
    } catch {
      // Gracefully handle malformed json
    }

    const output = renderStatusline(input);
    process.stdout.write(output);
  });
}

if (require.main === module) {
  run();
}

module.exports = {
  renderStatusline,
  loadConfig,
  formatCountdown,
  getMcpServerCount,
  readGitStatus,
  makeProgressBar,
  readLastUsageFromTranscript,
  stripAnsi,
  THEMES,
  getThemeColors,
  DEFAULT_FIELDS,
  DEFAULT_RATE_LIMIT_WINDOWS,
  GIT_TIMEOUT_MS,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_TEMPLATE,
  UI_PRESETS,
  parseJsonWithComments,
  FIELD_RENDERERS,
  run,
};
