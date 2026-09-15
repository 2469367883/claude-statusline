// @ts-check
"use strict";

const {
  DIM,
  CYAN,
  GREEN,
  YELLOW,
  RED,
  MAGENTA,
  RESET,
  makeProgressBar,
  formatCountdown,
  readLastUsageFromTranscript,
} = require("./utils.js");
const { readGitStatus } = require("./git.js");
const { getMcpServerCount } = require("./mcp.js");
const { DEFAULT_RATE_LIMIT_WINDOWS } = require("./config.js");

const fallbackColors = { DIM, CYAN, GREEN, YELLOW, RED, MAGENTA, RESET };

/**
 * Resolve colors palette from context
 * @param {any} ctx
 * @returns {typeof fallbackColors}
 */
function getColors(ctx) {
  return ctx?.colors || fallbackColors;
}

/**
 * Field Renderers Map
 */
const FIELD_RENDERERS = {
  /**
   * Model name renderer with auto date cleaning and custom alias mapping
   */
  model: (context) => {
    const { input, config, icons } = context;
    const clr = getColors(context);
    const modelRaw =
      typeof input.model === "string"
        ? input.model
        : input.model?.display_name || input.model?.id || "Claude";
    let model = String(modelRaw).replace(/\[.*\]$/, "").trim();

    // 1. Direct match with user aliases
    if (config?.modelAliases && typeof config.modelAliases[model] === "string") {
      model = config.modelAliases[model];
    } else {
      // 2. Auto clean trailing date suffix (e.g. -20250219, -20241022)
      const cleaned = model.replace(/-\d{8}$/, "");
      if (config?.modelAliases && typeof config.modelAliases[cleaned] === "string") {
        model = config.modelAliases[cleaned];
      } else {
        model = cleaned;
      }
    }

    return `${clr.GREEN}${icons.model}${model}${clr.RESET}`;
  },

  /**
   * Context tokens & progress bar renderer
   */
  context: (context) => {
    const { input, config, icons } = context;
    const clr = getColors(context);
    let usedTokens = null;
    let totalTokens = null;
    const ctx = input.context_window;

    const parsedCw = Number(config.contextWindowSize);
    if (!isNaN(parsedCw) && parsedCw > 0) {
      totalTokens = parsedCw;
    } else if (
      ctx &&
      typeof ctx === "object" &&
      typeof ctx.context_window_size === "number" &&
      ctx.context_window_size > 0
    ) {
      totalTokens = ctx.context_window_size;
    }

    if (ctx && typeof ctx === "object") {
      if (typeof ctx.total_input_tokens === "number") {
        usedTokens = ctx.total_input_tokens;
      } else if (typeof ctx.used_percentage === "number" && totalTokens) {
        usedTokens = Math.round((ctx.used_percentage / 100) * totalTokens);
      } else if (typeof ctx.used_tokens === "number") {
        usedTokens = ctx.used_tokens;
      }
    }

    if (usedTokens === null && input.transcript_path) {
      usedTokens = readLastUsageFromTranscript(input.transcript_path);
      if (usedTokens !== null && !totalTokens) {
        totalTokens = 200000;
      }
    }

    if (!totalTokens) {
      totalTokens = 200000;
    }

    if (typeof usedTokens === "number" && totalTokens > 0) {
      const usedUnit = usedTokens >= 1000000 ? "M" : "k";
      const totalUnit = totalTokens >= 1000000 ? "M" : "k";
      const usedDisplay =
        usedUnit === "M"
          ? (usedTokens / 1000000).toFixed(1)
          : (usedTokens / 1000).toFixed(1);
      const totalDisplay =
        totalUnit === "M"
          ? (totalTokens / 1000000).toFixed(1)
          : (totalTokens / 1000).toFixed(1);
      const pct = Math.round((usedTokens / totalTokens) * 100);

      const warnThreshold = Number(config.warningThreshold) || 80;
      const dangerThreshold = Number(config.dangerThreshold) || 90;
      const barLen = Number(config.progressBarLength) || 8;
      const color =
        pct >= dangerThreshold
          ? clr.RED
          : pct >= warnThreshold
          ? clr.YELLOW
          : pct >= 50
          ? clr.CYAN
          : clr.GREEN;

      const barStr = config.progressBar ? `${makeProgressBar(pct, barLen)} ` : "";

      return `${color}${icons.context}${barStr}${pct}% (${usedDisplay}${usedUnit}/${totalDisplay}${totalUnit})${clr.RESET}`;
    }
    return null;
  },

  /**
   * Prompt Cache Efficiency / Hit Rate (e.g. Cache:92%)
   */
  cache: (context) => {
    const { input, icons } = context;
    const clr = getColors(context);
    const usage = input.context_window?.current_usage;
    if (usage && typeof usage.cache_read_input_tokens === "number") {
      const cacheRead = usage.cache_read_input_tokens;
      const inputTokens = usage.input_tokens || 0;
      const total = cacheRead + inputTokens;
      if (total > 0 && cacheRead > 0) {
        const hitRate = Math.round((cacheRead / total) * 100);
        const color = hitRate >= 70 ? clr.GREEN : hitRate >= 40 ? clr.CYAN : clr.DIM;
        return `${color}${icons.cache}Cache:${hitRate}%${clr.RESET}`;
      }
    }
    return null;
  },

  /**
   * Session cost renderer with USD/CNY currency toggle & multiplier
   */
  cost: (context) => {
    const { input, config, icons } = context;
    const clr = getColors(context);
    if (typeof input.cost?.total_cost_usd === "number") {
      const rawUsd = input.cost.total_cost_usd;
      const numMultiplier = Number(config.costMultiplier);
      const multiplier = !isNaN(numMultiplier) && numMultiplier > 0 ? numMultiplier : 1.0;
      const numRate = Number(config.exchangeRate);
      const rate = !isNaN(numRate) && numRate > 0 ? numRate : 7.25;

      const effectiveUsd = rawUsd * multiplier;
      const effectiveCny = effectiveUsd * rate;

      const fmt = (num) => {
        if (num === 0) return "0.00";
        if (num >= 1) return num.toFixed(2);
        if (num >= 0.01) return num.toFixed(2);
        return num.toFixed(3);
      };

      let costText = "";
      const cur = (config.currency || "USD").toUpperCase();

      if (cur === "CNY") {
        costText = `¥${fmt(effectiveCny)}`;
      } else if (cur === "BOTH") {
        costText = `$${fmt(effectiveUsd)} (¥${fmt(effectiveCny)})`;
      } else {
        costText = `$${fmt(effectiveUsd)}`;
      }

      if (config.showCostMultiplier && multiplier !== 1) {
        costText += ` ${clr.DIM}(x${multiplier})${clr.RESET}`;
      }

      return `${clr.GREEN}${icons.cost}${costText}${clr.RESET}`;
    }
    return null;
  },

  /**
   * Code velocity (lines added / removed e.g. +142/-35)
   */
  lines: (context) => {
    const { input } = context;
    const clr = getColors(context);
    const added = input.cost?.total_lines_added;
    const removed = input.cost?.total_lines_removed;
    if (typeof added === "number" || typeof removed === "number") {
      const a = added || 0;
      const r = removed || 0;
      if (a > 0 || r > 0) {
        return `${clr.GREEN}+${a}${clr.RESET}/${clr.RED}-${r}${clr.RESET}`;
      }
    }
    return null;
  },

  /**
   * Rate Limits quota renderer (configurable cycles e.g. ["5h", "7d", "mo"] + reset countdown)
   */
  rate_limit: (context) => {
    const { input, config, icons } = context;
    const clr = getColors(context);
    const rl = input.rate_limits;
    if (!rl || typeof rl !== "object") return null;

    const requestedWindows = Array.isArray(config.rateLimitWindows)
      ? config.rateLimitWindows
      : DEFAULT_RATE_LIMIT_WINDOWS;

    const items = [];
    const warnThresh = Number(config.warningThreshold) || 80;
    const dangerThresh = Number(config.dangerThreshold) || 90;
    const showCountdown = config.showRateLimitCountdown !== false;

    for (const winKey of requestedWindows) {
      const key = String(winKey).toLowerCase();
      let entry = null;
      let label = "";

      if (key === "5h" || key === "five_hour" || key === "5_hour") {
        entry = rl.five_hour || rl["5h"] || rl["5_hour"];
        label = "5h";
      } else if (key === "7d" || key === "seven_day" || key === "weekly" || key === "7_day") {
        entry = rl.seven_day || rl["7d"] || rl.weekly || rl["7_day"];
        label = "7d";
      } else if (
        key === "mo" ||
        key === "monthly" ||
        key === "month" ||
        key === "30d" ||
        key === "thirty_day"
      ) {
        entry = rl.monthly || rl.month || rl.thirty_day || rl["30d"];
        label = "mo";
      }

      if (entry && typeof entry.used_percentage === "number") {
        const pct = Math.round(entry.used_percentage);
        const color = pct >= dangerThresh ? clr.RED : pct >= warnThresh ? clr.YELLOW : clr.DIM;

        let countdownStr = "";
        if (showCountdown && entry.resets_at) {
          const cd = formatCountdown(entry.resets_at);
          if (cd) {
            countdownStr = `(${cd})`;
          }
        }

        items.push(`${color}${icons.rate}${label}:${pct}%${countdownStr}${clr.RESET}`);
      }
    }

    return items.length > 0 ? items.join(" ") : null;
  },

  /**
   * Project directory renderer
   */
  project: (context) => {
    const { project } = context;
    const clr = getColors(context);
    return `${clr.CYAN}${project}${clr.RESET}`;
  },

  /**
   * Git branch & dirty status (with optional ahead/behind difference)
   */
  git: (context) => {
    const { cwd, config, icons } = context;
    const clr = getColors(context);
    const out = readGitStatus(cwd, config.gitCacheTtl);
    if (out === null) return null;

    const lines = out.split("\n");
    const branchMatch = (lines[0] || "").match(/^## (?:No commits yet on )?(\S+?)(?:\.\.\.|\s|$)/);
    const branch = branchMatch ? branchMatch[1] : "";
    if (!branch) return null;

    const dirty = lines.slice(1).some((l) => l.trim().length > 0);

    let aheadBehind = "";
    if (config.showGitAheadBehind) {
      const aheadMatch = (lines[0] || "").match(/ahead (\d+)/);
      const behindMatch = (lines[0] || "").match(/behind (\d+)/);
      if (aheadMatch) aheadBehind += ` ↑${aheadMatch[1]}`;
      if (behindMatch) aheadBehind += ` ↓${behindMatch[1]}`;
    }

    const dirtyMarker = dirty ? "*" : "";
    return `${clr.MAGENTA}${icons.git}${branch}${aheadBehind}${dirtyMarker}${clr.RESET}`;
  },

  /**
   * MCP Server count (e.g. MCP:3)
   */
  mcp: (context) => {
    const { cwd, icons } = context;
    const clr = getColors(context);
    const count = getMcpServerCount(cwd);
    if (count > 0) {
      return `${clr.CYAN}${icons.mcp}MCP:${count}${clr.RESET}`;
    }
    return null;
  },

  /**
   * Reasoning effort renderer (e.g. Claude 3.7)
   */
  effort: (context) => {
    const { input } = context;
    const clr = getColors(context);
    const level = input.effort?.level;
    if (level && level !== "none" && level !== "default") {
      return `${clr.DIM}[effort: ${level}]${clr.RESET}`;
    }
    return null;
  },

  /**
   * Output style tag renderer (e.g. [concise])
   */
  output_style: (context) => {
    const { input } = context;
    const clr = getColors(context);
    const styleName =
      typeof input.output_style === "string" ? input.output_style : input.output_style?.name;
    if (styleName && styleName !== "default") {
      return `${clr.DIM}[${styleName}]${clr.RESET}`;
    }
    return null;
  },
};

// Aliases
FIELD_RENDERERS.rate_limits = FIELD_RENDERERS.rate_limit;
FIELD_RENDERERS.velocity = FIELD_RENDERERS.lines;
FIELD_RENDERERS.code_velocity = FIELD_RENDERERS.lines;
FIELD_RENDERERS.cache_efficiency = FIELD_RENDERERS.cache;
FIELD_RENDERERS.style = FIELD_RENDERERS.output_style;

module.exports = {
  FIELD_RENDERERS,
};
