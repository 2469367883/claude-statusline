#!/usr/bin/env node
// @ts-check

/**
 * Claude Code Statusline CLI
 * Management tool for installing, previewing and configuring statusline.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { renderStatusline, run } = require("./statusline.js");

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
  return { claudeDir, settingsPath };
}

function install() {
  const { claudeDir, settingsPath } = getClaudeSettingsPath();
  const statuslinePath = path.resolve(__dirname, "statusline.js").replace(/\\/g, "/");

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, "utf8");
      settings = JSON.parse(raw || "{}");
      // Backup original settings
      const backupPath = path.join(claudeDir, "settings.json.bak");
      fs.writeFileSync(backupPath, raw, "utf8");
      console.log(`${DIM}  Backup saved to ${backupPath}${RESET}`);
    } catch (e) {
      console.error(`${RED}Failed to parse existing settings.json: ${e.message}${RESET}`);
      process.exit(1);
    }
  }

  settings.statusLine = {
    command: `node "${statuslinePath}"`,
    type: "command",
  };

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  console.log(`${GREEN}${BOLD}✔ Successfully configured claude-statusline!${RESET}`);
  console.log(`  Target:  ${CYAN}${settingsPath}${RESET}`);
  console.log(`  Command: ${DIM}node "${statuslinePath}"${RESET}\n`);
  console.log(`Restart Claude Code to see your new statusline.`);
}

function uninstall() {
  const { settingsPath } = getClaudeSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    console.log(`${YELLOW}settings.json not found, nothing to uninstall.${RESET}`);
    return;
  }

  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(raw || "{}");
    if (settings.statusLine) {
      delete settings.statusLine;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
      console.log(`${GREEN}${BOLD}✔ Successfully removed statusLine configuration from settings.json!${RESET}`);
    } else {
      console.log(`${YELLOW}statusLine was not configured in settings.json.${RESET}`);
    }
  } catch (e) {
    console.error(`${RED}Failed to update settings.json: ${e.message}${RESET}`);
    process.exit(1);
  }
}

function preview() {
  console.log(`\n${BOLD}Claude Code Statusline Preview${RESET}\n`);

  const repoDir = path.resolve(__dirname, "..");
  const scenarios = [
    {
      title: "1. Standard Session (Normal usage)",
      input: {
        workspace: { current_dir: repoDir },
        model: { display_name: "claude-3-7-sonnet" },
        context_window: { total_input_tokens: 24500, context_window_size: 200000 },
      },
    },
    {
      title: "2. Large Model Context (1M tokens)",
      input: {
        workspace: { current_dir: repoDir },
        model: { display_name: "claude-sonnet-5[1M]" },
        context_window: { total_input_tokens: 350000, context_window_size: 1000000 },
      },
    },
    {
      title: "3. High Context Usage (>= 80% Warning Yellow)",
      input: {
        workspace: { current_dir: repoDir },
        model: { display_name: "claude-3-7-sonnet" },
        context_window: { total_input_tokens: 168000, context_window_size: 200000 },
      },
    },
    {
      title: "4. Custom Output Style (concise)",
      input: {
        workspace: { current_dir: repoDir },
        model: { display_name: "claude-3-7-sonnet" },
        context_window: { total_input_tokens: 12000, context_window_size: 200000 },
        output_style: { name: "concise" },
      },
    },
    {
      title: "5. Non-Git Directory",
      input: {
        workspace: { current_dir: os.tmpdir() },
        model: { display_name: "claude-3-7-sonnet" },
        context_window: { total_input_tokens: 5200, context_window_size: 200000 },
      },
    },
  ];

  scenarios.forEach(({ title, input }) => {
    console.log(`${DIM}${title}${RESET}`);
    console.log("  " + renderStatusline(input));
    console.log();
  });
}

function showHelp() {
  console.log(`
${BOLD}claude-statusline${RESET}
A clean, ultra-fast and zero-dependency statusline for Claude Code.

${BOLD}USAGE:${RESET}
  claude-statusline [command]

${BOLD}COMMANDS:${RESET}
  ${CYAN}install${RESET}      Configure ~/.claude/settings.json automatically
  ${CYAN}uninstall${RESET}    Remove statusline from ~/.claude/settings.json
  ${CYAN}preview${RESET}      Preview statusline styles with mock data in terminal
  ${CYAN}help${RESET}         Show this help message

${BOLD}PIPED USAGE:${RESET}
  cat session.json | claude-statusline
`);
}

const arg = (process.argv[2] || "").toLowerCase();

if (arg === "install" || arg === "i") {
  install();
} else if (arg === "uninstall" || arg === "remove") {
  uninstall();
} else if (arg === "preview" || arg === "p") {
  preview();
} else if (arg === "--help" || arg === "-h" || arg === "help") {
  showHelp();
} else {
  if (!process.stdin.isTTY) {
    run();
  } else {
    showHelp();
  }
}
