#!/usr/bin/env node
// @ts-check

/**
 * Claude Code Statusline
 * Zero-dependency, ultra-fast statusline renderer for Claude Code.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, spawn } = require("child_process");

const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

/**
 * @typedef {Object} ClaudeContextWindow
 * @property {number} [total_input_tokens]
 * @property {number} [context_window_size]
 * @property {number} [used_percentage]
 * @property {number} [used_tokens]
 * @property {number} [total_tokens]
 *
 * @typedef {Object} ClaudeSessionInput
 * @property {{ current_dir?: string }} [workspace]
 * @property {string} [cwd]
 * @property {{ display_name?: string, id?: string }} [model]
 * @property {ClaudeContextWindow} [context_window]
 * @property {string} [transcript_path]
 * @property {{ name?: string } | string} [output_style]
 */

/**
 * Render the statusline string from session input object
 * @param {ClaudeSessionInput} input
 * @returns {string}
 */
function renderStatusline(input = {}) {
  const cwd = input.workspace?.current_dir || input.cwd || process.cwd();
  const project = path.basename(cwd);

  // 1. Model name (strip register suffix like [1M])
  const modelRaw = input.model?.display_name || input.model?.id || "Claude";
  const model = modelRaw.replace(/\[.*\]$/, "");

  // 2. Context tokens usage
  let usedTokens = null;
  let totalTokens = null;
  const ctx = input.context_window;

  if (ctx && typeof ctx === "object") {
    if (typeof ctx.total_input_tokens === "number" && typeof ctx.context_window_size === "number" && ctx.context_window_size > 0) {
      usedTokens = ctx.total_input_tokens;
      totalTokens = ctx.context_window_size;
    } else if (typeof ctx.used_percentage === "number" && typeof ctx.context_window_size === "number" && ctx.context_window_size > 0) {
      totalTokens = ctx.context_window_size;
      usedTokens = Math.round((ctx.used_percentage / 100) * totalTokens);
    } else if (typeof ctx.used_tokens === "number" && typeof ctx.total_tokens === "number" && ctx.total_tokens > 0) {
      usedTokens = ctx.used_tokens;
      totalTokens = ctx.total_tokens;
    }
  }

  // Fallback: estimate from transcript usage records
  if (usedTokens === null && input.transcript_path) {
    try {
      const lines = fs.readFileSync(input.transcript_path, "utf8").split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i] || !lines[i].includes('"usage"')) continue;
        try {
          const rec = JSON.parse(lines[i]);
          const u = rec.message && rec.message.usage;
          if (u) {
            usedTokens = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
            totalTokens = 200000;
            break;
          }
        } catch {}
      }
    } catch {}
  }

  let contextStr = null;
  if (typeof usedTokens === "number" && typeof totalTokens === "number" && totalTokens > 0) {
    const usedUnit = usedTokens >= 1000000 ? "M" : "k";
    const totalUnit = totalTokens >= 1000000 ? "M" : "k";
    const usedDisplay = usedUnit === "M"
      ? (usedTokens / 1000000).toFixed(1)
      : (usedTokens / 1000).toFixed(1);
    const totalDisplay = totalUnit === "M"
      ? (totalTokens / 1000000).toFixed(1)
      : (totalTokens / 1000).toFixed(1);
    const pct = Math.round((usedTokens / totalTokens) * 100);
    const color = pct >= 80 ? YELLOW : DIM;
    contextStr = `${color}${pct}% (${usedDisplay}${usedUnit}/${totalDisplay}${totalUnit})${RESET}`;
  }

  const parts = [];

  // Model
  parts.push(`${GREEN}${model}${RESET}`);

  // Context tokens
  if (contextStr) {
    parts.push(contextStr);
  }

  // Project
  parts.push(`${CYAN}${project}${RESET}`);

  // Git branch & dirty status (safe timeout & no optional locks)
  let gitInfo = "";
  try {
    const out = execFileSync(
      "git",
      ["--no-optional-locks", "-C", cwd, "status", "--porcelain", "--branch"],
      {
        timeout: 800,
        stdio: ["ignore", "pipe", "ignore"],
      }
    ).toString();

    const lines = out.split("\n");
    const branchMatch = (lines[0] || "").match(/^## (?:No commits yet on )?(\S+?)(?:\.\.\.|\s|$)/);
    const branch = branchMatch ? branchMatch[1] : "";
    if (branch) {
      const dirty = lines.slice(1).some((l) => l.trim().length > 0);
      gitInfo = branch + (dirty ? "*" : "");
    }
  } catch {
    // Non-git directory or git error: gracefully ignore
  }

  if (gitInfo) {
    parts.push(`${MAGENTA}${gitInfo}${RESET}`);
  }

  // Output style (if not default)
  const styleName = typeof input.output_style === "string"
    ? input.output_style
    : input.output_style?.name;
  if (styleName && styleName !== "default") {
    parts.push(`${DIM}[${styleName}]${RESET}`);
  }

  return parts.join(` ${DIM}|${RESET} `);
}

/**
 * Asynchronously forward payload to Orca hook if running inside Orca
 * Non-blocking, fails silently if not present.
 * @param {string} rawPayload
 */
function forwardToOrca(rawPayload) {
  if (!process.env.ORCA_AGENT_HOOK_PORT || !process.env.ORCA_PANE_KEY) return;
  const hookPath = path.join(os.homedir(), ".orca", "agent-hooks", "claude-statusline.cmd");
  if (!fs.existsSync(hookPath)) return;

  try {
    const child = spawn(hookPath, [], {
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
    });
    child.stdin.end(rawPayload);
    child.unref();
  } catch {}
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

    forwardToOrca(raw);

    const output = renderStatusline(input);
    process.stdout.write(output);
  });
}

if (require.main === module) {
  run();
}

module.exports = {
  renderStatusline,
  run,
};
