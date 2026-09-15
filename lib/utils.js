// @ts-check
"use strict";

const fs = require("fs");

const THEMES = {
  default: {
    DIM: "\x1b[2m",
    CYAN: "\x1b[36m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    RED: "\x1b[31m",
    MAGENTA: "\x1b[35m",
    RESET: "\x1b[0m",
  },
  catppuccin: {
    DIM: "\x1b[2m",
    CYAN: "\x1b[38;2;137;220;235m", // #89dceb
    GREEN: "\x1b[38;2;166;227;161m", // #a6e3a1
    YELLOW: "\x1b[38;2;249;226;175m", // #f9e2af
    RED: "\x1b[38;2;243;139;168m", // #f38ba8
    MAGENTA: "\x1b[38;2;203;166;247m", // #cba6f7
    RESET: "\x1b[0m",
  },
  nord: {
    DIM: "\x1b[2m",
    CYAN: "\x1b[38;2;136;192;208m", // #88C0D0
    GREEN: "\x1b[38;2;163;190;140m", // #A3BE8C
    YELLOW: "\x1b[38;2;235;203;139m", // #EBCB8B
    RED: "\x1b[38;2;191;97;106m", // #BF616A
    MAGENTA: "\x1b[38;2;180;142;173m", // #B48EAD
    RESET: "\x1b[0m",
  },
  tokyo: {
    DIM: "\x1b[2m",
    CYAN: "\x1b[38;2;122;162;247m", // #7aa2f7
    GREEN: "\x1b[38;2;158;206;106m", // #9ece6a
    YELLOW: "\x1b[38;2;224;175;104m", // #e0af68
    RED: "\x1b[38;2;247;118;142m", // #f7768e
    MAGENTA: "\x1b[38;2;187;154;247m", // #bb9af7
    RESET: "\x1b[0m",
  },
};

const { DIM, CYAN, GREEN, YELLOW, RED, MAGENTA, RESET } = THEMES.default;

/**
 * Get color scheme palette by theme name
 * @param {string} [themeName]
 * @returns {typeof THEMES.default}
 */
function getThemeColors(themeName) {
  const name = String(themeName || "default").toLowerCase();
  return THEMES[name] || THEMES.default;
}

/**
 * Strip ANSI escape codes from string
 * @param {string} str
 * @returns {string}
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Build a compact character progress bar
 * @param {number} pct (0 - 100)
 * @param {number} length
 * @returns {string}
 */
function makeProgressBar(pct, length = 8) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

/**
 * Format reset countdown time from resets_at timestamp / ISO string
 * @param {string | number | undefined} resetsAt
 * @returns {string} e.g. "2h15m", "45m", "3d4h"
 */
function formatCountdown(resetsAt) {
  if (!resetsAt) return "";

  let targetMs = 0;
  if (typeof resetsAt === "number") {
    targetMs = resetsAt < 1e11 ? resetsAt * 1000 : resetsAt;
  } else if (typeof resetsAt === "string") {
    const parsed = Date.parse(resetsAt);
    if (!isNaN(parsed)) {
      targetMs = parsed;
    } else {
      const num = Number(resetsAt);
      if (!isNaN(num)) {
        targetMs = num < 1e11 ? num * 1000 : num;
      }
    }
  }

  if (!targetMs) return "";

  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return "<1m";

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);

  if (days > 0) {
    return `${days}d${hours}h`;
  } else if (hours > 0) {
    return `${hours}h${mins}m`;
  } else {
    return `${Math.max(1, mins)}m`;
  }
}

/**
 * Format a duration in milliseconds to human-readable string (e.g. 38m, 1h 24m, 2d 5h)
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (typeof ms !== "number" || isNaN(ms) || ms < 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  } else if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else if (mins > 0) {
    return `${mins}m`;
  } else {
    return "<1m";
  }
}

/**
 * Read the last token usage from a transcript file without loading the entire file.
 * Reads backwards from the end of the file in chunks (up to 64KB) for maximum performance.
 *
 * @param {string} transcriptPath
 * @returns {number | null}
 */
function readLastUsageFromTranscript(transcriptPath) {
  if (!transcriptPath || typeof transcriptPath !== "string") return null;

  let fd = null;
  try {
    if (!fs.existsSync(transcriptPath)) return null;
    const stat = fs.statSync(transcriptPath);
    if (stat.size === 0) return null;

    const CHUNK_SIZE = 64 * 1024; // 64KB buffer
    const readSize = Math.min(stat.size, CHUNK_SIZE);
    const buffer = Buffer.alloc(readSize);
    fd = fs.openSync(transcriptPath, "r");

    const offset = Math.max(0, stat.size - readSize);
    fs.readSync(fd, buffer, 0, readSize, offset);

    const chunkStr = buffer.toString("utf8");
    const lines = chunkStr.split("\n");
    const startIndex = offset > 0 ? 1 : 0;

    for (let i = lines.length - 1; i >= startIndex; i--) {
      const line = lines[i].trim();
      if (!line || !line.includes('"usage"')) continue;
      try {
        const rec = JSON.parse(line);
        const u = rec.message?.usage || rec.usage;
        if (u) {
          const total =
            (u.input_tokens || 0) +
            (u.cache_read_input_tokens || 0) +
            (u.cache_creation_input_tokens || 0) +
            (u.output_tokens || 0);
          return total;
        }
      } catch {}
    }
  } catch {
    // Ignore transcript reading errors gracefully
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }

  return null;
}

module.exports = {
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
  formatDuration,
  readLastUsageFromTranscript,
};
