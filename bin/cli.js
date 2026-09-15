#!/usr/bin/env node
// @ts-check

/**
 * Claude Code Statusline CLI
 * Management tool for installing, previewing and configuring statusline.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  renderStatusline,
  run,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_TEMPLATE,
  UI_PRESETS,
  parseJsonWithComments,
} = require("./statusline.js");

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function getClaudeSettingsPath() {
  const home = os.homedir();
  const claudeDir = path.join(home, ".claude");
  const settingsPath = path.join(claudeDir, "settings.json");
  const configPath = path.join(claudeDir, "statusline.config.json");
  return { claudeDir, settingsPath, configPath };
}

function install(ifUnset = false) {
  const { claudeDir, settingsPath } = getClaudeSettingsPath();
  const statuslinePath = path.resolve(__dirname, "statusline.js").replace(/\\/g, "/");

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  if (statuslinePath.includes("_npx") || statuslinePath.includes("npm-cache")) {
    console.log(`${YELLOW}⚠️  提示: 检测到当前正通过 npx 临时运行。${RESET}`);
    console.log(`${YELLOW}   为避免 npm 清理临时缓存后状态栏失效，建议全局安装：${CYAN}npm install -g claude-statusline${RESET}\n`);
  }

  let settings = {};
  let rawSettings = "";
  if (fs.existsSync(settingsPath)) {
    try {
      rawSettings = fs.readFileSync(settingsPath, "utf8");
      settings = JSON.parse(rawSettings || "{}");
    } catch (e) {
      console.error(`${RED}Failed to parse existing settings.json: ${e.message}${RESET}`);
      return;
    }
  }

  // postinstall path: never overwrite a statusLine the user already has
  if (ifUnset && settings.statusLine) {
    console.log(`${DIM}  Existing statusLine detected — skipping auto-configuration.${RESET}`);
    console.log(`${DIM}  Run "claude-code-status install" (or "ccs install") to overwrite it.${RESET}`);
    return;
  }

  if (rawSettings) {
    // Backup original settings
    const backupPath = path.join(claudeDir, "settings.json.bak");
    fs.writeFileSync(backupPath, rawSettings, "utf8");
    console.log(`${DIM}  Backup saved to ${backupPath}${RESET}`);
  }

  // Auto-generate annotated configuration file if it doesn't exist
  initConfig(false);

  settings.statusLine = {
    command: `node "${statuslinePath}"`,
    type: "command",
  };

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  console.log(`${GREEN}${BOLD}✔ Successfully configured claude-code-status (ccs)!${RESET}`);
  console.log(`  Target:  ${CYAN}${settingsPath}${RESET}`);
  console.log(`  Command: ${DIM}node "${statuslinePath}"${RESET}\n`);
  console.log(`Default fields enabled: ${GREEN}model, context, project, git${RESET}`);
  console.log(`Custom config created at: ${CYAN}${getClaudeSettingsPath().configPath}${RESET}`);
  console.log(`You can uncomment optional features (cost, rate_limit, cache, lines, mcp) anytime in this file.\n`);
  console.log(`Restart Claude Code to see your new statusline.`);
}

function uninstall() {
  const { settingsPath } = getClaudeSettingsPath();
  const statuslinePath = path.resolve(__dirname, "statusline.js").replace(/\\/g, "/");

  if (!fs.existsSync(settingsPath)) {
    console.log(`${YELLOW}settings.json not found, nothing to uninstall.${RESET}`);
    return;
  }

  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(raw || "{}");

    if (!settings.statusLine) {
      console.log(`${YELLOW}statusLine was not configured in settings.json.${RESET}`);
      return;
    }

    // Only remove a statusLine this tool installed; leave anyone else's alone
    const command = typeof settings.statusLine.command === "string" ? settings.statusLine.command : "";
    if (!command.includes(statuslinePath)) {
      console.log(`${YELLOW}statusLine is not managed by claude-code-status, leaving it untouched.${RESET}`);
      return;
    }

    delete settings.statusLine;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
    console.log(`${GREEN}${BOLD}✔ Successfully removed statusLine configuration from settings.json!${RESET}`);
  } catch (e) {
    console.error(`${RED}Failed to update settings.json: ${e.message}${RESET}`);
    process.exit(1);
  }
}

function initConfig(verbose = true) {
  const { claudeDir, configPath } = getClaudeSettingsPath();
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  if (fs.existsSync(configPath)) {
    if (verbose) {
      console.log(`${YELLOW}Config file already exists at ${configPath}${RESET}`);
    }
    return;
  }

  fs.writeFileSync(configPath, DEFAULT_CONFIG_TEMPLATE, "utf8");
  if (verbose) {
    console.log(`${GREEN}${BOLD}✔ Created annotated default config at:${RESET} ${CYAN}${configPath}${RESET}`);
    console.log(`Default fields enabled: ${GREEN}model, context, project, git${RESET}`);
    console.log(`Optional features (cost, rate_limit, cache, lines, mcp) are commented and ready to enable.`);
  }
}

function applyPreset(presetKey) {
  const preset = UI_PRESETS[presetKey];
  if (!preset) {
    console.log(`${RED}Unknown preset: ${presetKey}${RESET}`);
    console.log(`Available presets: ${Object.keys(UI_PRESETS).join(", ")}`);
    return;
  }

  const { configPath } = getClaudeSettingsPath();
  initConfig(false);

  try {
    let raw = fs.readFileSync(configPath, "utf8");

    // Update keys in the config string while preserving existing fields & comments.
    // The replacement must be a function: with a string replacement, `$&`, `$'`
    // or `$1` occurring inside the serialized value would be treated as
    // substitution patterns and corrupt the file.
    for (const [k, v] of Object.entries(preset.config)) {
      const reg = new RegExp(`("${k}"\\s*:\\s*)(true|false|\\d+|"(?:\\\\.|[^"\\\\])*"|[^,\\s]+)(\\s*,?)([^\\n]*)`);
      if (reg.test(raw)) {
        raw = raw.replace(reg, (_match, prefix, _val, comma, trailing) => `${prefix}${JSON.stringify(v)}${comma}${trailing}`);
      } else {
        raw = raw.replace(/(\n\s*)}(\s*)$/, (_match, indent, tail) => `,\n  "${k}": ${JSON.stringify(v)}${indent}}${tail}`);
      }
    }

    fs.writeFileSync(configPath, raw, "utf8");
    console.log(`${GREEN}${BOLD}✔ Successfully applied preset: ${preset.name}!${RESET}`);
    console.log(`${DIM}  Description: ${preset.description}${RESET}\n`);

    const sample = {
      workspace: { current_dir: path.resolve(__dirname, "..") },
      model: { display_name: "claude-3-7-sonnet" },
      context_window: { total_input_tokens: 58000, context_window_size: 200000 },
    };
    console.log(`${BOLD}Live preview with this UI preset:${RESET}`);
    console.log("  " + renderStatusline(sample).split("\n").join("\n  ") + "\n");
  } catch (e) {
    console.error(`${RED}Failed to update config: ${e.message}${RESET}`);
  }
}

function setDelimiter(newDelimiter) {
  if (typeof newDelimiter !== "string") {
    console.log(`${YELLOW}请提供分割符号，例如: claude-statusline delimiter / 或 claude-statusline delimiter "•"${RESET}`);
    return;
  }

  const { configPath } = getClaudeSettingsPath();
  initConfig(false);

  try {
    let raw = fs.readFileSync(configPath, "utf8");
    const reg = /("delimiter"\s*:\s*)(true|false|\d+|"(?:\\.|[^"\\])*"|[^,\s]+)(\s*,?)([^\n]*)/;
    if (reg.test(raw)) {
      raw = raw.replace(reg, (_match, prefix, _val, comma, trailing) => `${prefix}${JSON.stringify(newDelimiter)}${comma}${trailing}`);
    } else {
      raw = raw.replace(/(\n\s*)}(\s*)$/, (_match, indent, tail) => `,\n  "delimiter": ${JSON.stringify(newDelimiter)}${indent}}${tail}`);
    }

    fs.writeFileSync(configPath, raw, "utf8");
    console.log(`${GREEN}${BOLD}✔ 分割符号已成功设置为: ${JSON.stringify(newDelimiter)}！${RESET}\n`);

    const sample = {
      workspace: { current_dir: path.resolve(__dirname, "..") },
      model: { display_name: "claude-3-7-sonnet" },
      context_window: { total_input_tokens: 58000, context_window_size: 200000 },
    };
    console.log(`${BOLD}当前效果预览:${RESET}`);
    console.log("  " + renderStatusline(sample).split("\n").join("\n  ") + "\n");
  } catch (e) {
    console.error(`${RED}更新配置文件失败: ${e.message}${RESET}`);
  }
}

function setTheme(newTheme) {
  const validThemes = ["default", "catppuccin", "nord", "tokyo"];
  if (!newTheme || !validThemes.includes(newTheme.toLowerCase())) {
    console.log(`${YELLOW}请指定有效的主题名称: ${validThemes.join(", ")}${RESET}`);
    console.log(`例如: claude-statusline theme catppuccin`);
    return;
  }

  const themeName = newTheme.toLowerCase();
  const { configPath } = getClaudeSettingsPath();
  initConfig(false);

  try {
    let raw = fs.readFileSync(configPath, "utf8");
    const reg = /("theme"\s*:\s*)(true|false|\d+|"(?:\\.|[^"\\])*"|[^,\s]+)(\s*,?)([^\n]*)/;
    if (reg.test(raw)) {
      raw = raw.replace(
        reg,
        (_match, prefix, _val, comma, trailing) =>
          `${prefix}${JSON.stringify(themeName)}${comma}${trailing}`
      );
    } else {
      raw = raw.replace(
        /(\n\s*)}(\s*)$/,
        (_match, indent, tail) => `,\n  "theme": ${JSON.stringify(themeName)}${indent}}${tail}`
      );
    }

    fs.writeFileSync(configPath, raw, "utf8");
    console.log(`${GREEN}${BOLD}✔ 主题已成功切换为: ${themeName}！${RESET}\n`);

    const sample = {
      workspace: { current_dir: path.resolve(__dirname, "..") },
      model: { display_name: "claude-3-7-sonnet" },
      context_window: { total_input_tokens: 58000, context_window_size: 200000 },
    };
    console.log(`${BOLD}当前主题效果预览:${RESET}`);
    console.log("  " + renderStatusline(sample).split("\n").join("\n  ") + "\n");
  } catch (e) {
    console.error(`${RED}更新配置文件失败: ${e.message}${RESET}`);
  }
}

function showUiPicker(targetArg) {
  const presetKeys = Object.keys(UI_PRESETS);

  if (targetArg) {
    const matched = presetKeys.find(
      (k, idx) => k.toLowerCase() === targetArg.toLowerCase() || String(idx + 1) === targetArg
    );
    if (matched) {
      applyPreset(matched);
      return;
    }
  }

  console.log(`\n${BOLD}Claude Code Statusline UI Presets (风格挑选):${RESET}\n`);

  const sample = {
    workspace: { current_dir: path.resolve(__dirname, "..") },
    model: { display_name: "claude-3-7-sonnet" },
    context_window: { total_input_tokens: 58000, context_window_size: 200000 },
  };

  presetKeys.forEach((key, idx) => {
    const p = UI_PRESETS[key];
    const previewLines = renderStatusline(sample, p.config).split("\n");
    console.log(`${CYAN}[${idx + 1}] ${BOLD}${p.name}${RESET} - ${DIM}${p.description}${RESET}`);
    console.log(previewLines.map((l) => `    ${l}`).join("\n") + "\n");
  });

  const { configPath } = getClaudeSettingsPath();
  let currentDelimiter = "|";
  try {
    if (fs.existsSync(configPath)) {
      const cfg = parseJsonWithComments(fs.readFileSync(configPath, "utf8"));
      if (typeof cfg.delimiter === "string") currentDelimiter = cfg.delimiter;
    }
  } catch {}

  const delimiterOptionIdx = presetKeys.length + 1;
  console.log(`${CYAN}[${delimiterOptionIdx}] ${BOLD}自定义分割符号 (当前: ${JSON.stringify(currentDelimiter)})${RESET} - ${DIM}输入任意分割符号 (如 /, •, ::, - 等)${RESET}\n`);

  if (process.stdin.isTTY) {
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${BOLD}请输入选项编号 [1-${delimiterOptionIdx}] 或名称: ${RESET}`, (answer) => {
      const trimmed = answer.trim();
      if (!trimmed) {
        rl.close();
        return;
      }
      if (trimmed === String(delimiterOptionIdx) || trimmed.toLowerCase() === "delimiter" || trimmed.toLowerCase() === "sep") {
        rl.question(`${BOLD}请输入新的分割符号 (回车确认): ${RESET}`, (newSep) => {
          rl.close();
          if (newSep) {
            setDelimiter(newSep);
          }
        });
        return;
      }
      rl.close();
      const chosen = presetKeys.find(
        (k, idx) => String(idx + 1) === trimmed || k.toLowerCase() === trimmed.toLowerCase()
      );
      if (chosen) {
        applyPreset(chosen);
      } else {
        console.log(`${YELLOW}未找到对应风格，保持原样。${RESET}`);
      }
    });
  } else {
    console.log(`${DIM}使用命令切换风格: claude-statusline ui <编号或名称>${RESET}`);
    console.log(`${DIM}使用命令修改分割符号: claude-statusline delimiter <符号>${RESET}`);
    console.log(`例如: claude-statusline delimiter / 或 claude-statusline delimiter "•"\n`);
  }
}

function preview() {
  console.log(`\n${BOLD}Claude Code Statusline Preview (Full Suite Showcase)${RESET}\n`);

  const repoDir = path.resolve(__dirname, "..");
  const now = Date.now();
  const resetIn2h15m = new Date(now + 2 * 3600 * 1000 + 15 * 60 * 1000).toISOString();
  const resetIn3d4h = new Date(now + (3 * 86400 + 4 * 3600) * 1000).toISOString();

  const sampleInput = {
    workspace: { current_dir: repoDir },
    model: { display_name: "claude-3-7-sonnet" },
    context_window: {
      total_input_tokens: 58000,
      context_window_size: 200000,
      current_usage: {
        input_tokens: 4640,
        cache_read_input_tokens: 53360,
      },
    },
    cost: {
      total_cost_usd: 0.185,
      total_lines_added: 185,
      total_lines_removed: 32,
    },
    rate_limits: {
      five_hour: { used_percentage: 28, resets_at: resetIn2h15m },
      seven_day: { used_percentage: 42, resets_at: resetIn3d4h },
    },
    effort: { level: "high" },
  };

  const scenarios = [
    {
      title: "1. Default Out-of-the-Box Mode (Model, Context, Project, Git *)",
      input: sampleInput,
      config: {},
    },
    {
      title: "2. All Features Enabled (Cost, Multi-Quota, Cache Hit Rate, Velocity, MCP)",
      input: sampleInput,
      config: {
        fields: ["model", "context", "cost", "rate_limit", "cache", "project", "git", "lines", "mcp", "effort"],
        currency: "BOTH",
        showGitAheadBehind: false,
      },
    },
    {
      title: "3. Git Remote Sync (showGitAheadBehind: true -> main ↑2 ↓1*)",
      input: sampleInput,
      config: {
        fields: ["model", "context", "cost", "rate_limit", "cache", "project", "git", "lines", "mcp"],
        currency: "CNY",
        showGitAheadBehind: true,
      },
    },
    {
      title: "4. Dual-Line Layout (lines: 2) - Perfect for narrow/split terminals!",
      input: sampleInput,
      config: {
        fields: ["model", "context", "cost", "rate_limit", "cache", "project", "git", "lines", "mcp"],
        lines: 2,
        currency: "CNY",
        costMultiplier: 1.5,
        showCostMultiplier: true,
      },
    },
    {
      title: "5. Unicode Icons Mode (免字体通用符号: ✦, ⚡, ⎇, ⏱)",
      input: sampleInput,
      config: {
        fields: ["model", "context", "cost", "rate_limit", "cache", "project", "git", "lines", "mcp", "effort"],
        icons: "unicode",
        currency: "CNY",
      },
    },
    {
      title: "6. Catppuccin Theme + Model Alias (theme: 'catppuccin', modelAliases: Sonnet 3.7)",
      input: {
        ...sampleInput,
        model: { id: "claude-3-7-sonnet-20250219" },
      },
      config: {
        theme: "catppuccin",
        modelAliases: { "claude-3-7-sonnet": "Sonnet 3.7" },
        fields: ["model", "context", "cost", "project", "git"],
        currency: "BOTH",
      },
    },
    {
      title: "7. Tokyo Night Theme (theme: 'tokyo')",
      input: sampleInput,
      config: {
        theme: "tokyo",
        fields: ["model", "context", "cost", "rate_limit", "project", "git"],
        currency: "CNY",
      },
    },
  ];

  scenarios.forEach(({ title, input, config }) => {
    console.log(`${DIM}${title}${RESET}`);
    console.log(renderStatusline(input, config).split("\n").map(l => "  " + l).join("\n"));
    console.log();
  });
}

function showHelp() {
  console.log(`
${BOLD}claude-code-status (ccs)${RESET}
A clean, ultra-fast and zero-dependency statusline and observability suite for Claude Code.

${BOLD}USAGE:${RESET}
  claude-code-status [command]
  ccs [command]

${BOLD}COMMANDS:${RESET}
  ${CYAN}install${RESET}      Configure ~/.claude/settings.json (or repair: ccs fix)
                  Add ${DIM}--if-unset${RESET} to skip when a statusLine already exists
  ${CYAN}uninstall${RESET}    Remove statusline from ~/.claude/settings.json
  ${CYAN}ui [name]${RESET}    Interactive UI style picker & switcher (or apply by name/number)
  ${CYAN}theme <name>${RESET} Set color theme (default, catppuccin, nord, tokyo)
  ${CYAN}delimiter <s>${RESET} Set delimiter symbol (default: "|", e.g. "/" or "•")
  ${CYAN}preview${RESET}      Preview statusline styles and layouts
  ${CYAN}init-config${RESET}  Generate ~/.claude/statusline.config.json with full annotations
  ${CYAN}help${RESET}         Show this help message

${BOLD}DEFAULT FIELDS:${RESET}
  ${GREEN}model${RESET}        AI Model name (e.g. claude-3-7-sonnet)
  ${GREEN}context${RESET}      Token usage and progress bar (e.g. [██░░░░░░] 29% (58k/200k))
  ${GREEN}project${RESET}      Current project directory
  ${GREEN}git${RESET}          Git branch and dirty marker (*)

${BOLD}OPTIONAL FIELDS (Uncomment in ~/.claude/statusline.config.json):${RESET}
  ${CYAN}cost${RESET}         Session cost in USD / CNY (with custom pricing multiplier)
  ${CYAN}rate_limit${RESET}   5-hour, 7-day, and monthly quota with reset countdown
  ${CYAN}cache${RESET}        Prompt cache hit rate (e.g. Cache:92%)
  ${CYAN}lines${RESET}        Code velocity (+lines/-lines added and removed)
  ${CYAN}mcp${RESET}          Configured MCP servers count (e.g. MCP:2)
  ${CYAN}effort${RESET}       Claude 3.7 reasoning effort level
  ${CYAN}output_style${RESET} Output style tag (e.g. [concise])

${BOLD}PIPED USAGE:${RESET}
  cat session.json | ccs
`);
}

const arg = (process.argv[2] || "").toLowerCase();

if (arg === "install" || arg === "i" || arg === "fix" || arg === "repair") {
  install(process.argv.includes("--if-unset"));
} else if (arg === "uninstall" || arg === "remove") {
  uninstall();
} else if (arg === "theme" || arg === "color") {
  setTheme(process.argv[3]);
} else if (arg === "ui" || arg === "preset") {
  showUiPicker(process.argv[3]);
} else if (arg === "delimiter" || arg === "sep") {
  setDelimiter(process.argv[3]);
} else if (arg === "preview" || arg === "p") {
  preview();
} else if (arg === "init-config" || arg === "config") {
  initConfig();
} else if (arg === "--help" || arg === "-h" || arg === "help") {
  showHelp();
} else {
  if (!process.stdin.isTTY) {
    run();
  } else {
    showHelp();
  }
}
