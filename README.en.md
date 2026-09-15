# claude-code-status (ccs)

A lightweight, zero-dependency statusline and observability tool for [Claude Code](https://github.com/anthropics/claude-code).

[简体中文](README.md) | English

---

## Preview

### Default Mode
```text
claude-3-7-sonnet | [██░░░░░░] 29% (58.0k/200.0k) | your-project | main*
```

### Full Features Enabled
```text
Sonnet 3.7 | [██░░░░░░] 29% (58.0k/200.0k) | $0.18 (¥1.34) | 5h:28%(2h14m) | Cache:92% | your-project | main* | +185/-32 | MCP:2 | [effort: high]
```

---

## Design Highlights & Key Strengths

Statusline scripts are executed as independent subprocesses every time the prompt redraws. `claude-code-status` is designed for **fast execution**, **zero maintenance overhead**, and **reliable cross-platform operation**:

- **Zero External Dependencies**: Implemented strictly with native Node.js standard modules (`fs`, `path`, `child_process`, `crypto`). If you run Claude Code, you already have Node.js. No build tools, no background daemons, and zero `node_modules` to manage.
- **Ultra-Fast Latency (1~3ms)**: Because the script is invoked repeatedly on terminal redraws, execution time is kept under 3ms to avoid typing lag or cursor stutter.
- **Native Cross-Platform**: Operates out of the box on Windows (PowerShell and CMD), macOS, and Linux without needing `bash`, `jq`, or WSL.
- **Subprocess-Safe Git Caching**: In large git repositories, running `git status` repeatedly can slow down the terminal. This tool caches `git status` output in the OS temporary directory with a configurable TTL (default: 2s) and enforces a 2-second timeout.
- **Memory-Safe Transcript Tail-Parsing**: When context token data is retrieved from session logs, it reads only the last 64KB chunk in reverse buffer rather than loading entire multi-megabyte JSONL files into memory.
- **Dual Currency & Proxy Pricing**: Supports USD, CNY, or both simultaneously, with a configurable pricing multiplier (`costMultiplier`) for developers routing through API proxies or resellers.

---

## Features

- **Minimal Defaults**: Shows model name, context window usage with progress bar, current directory, and Git branch.
- **Short CLI Alias**: Installed as `claude-code-status` with a 3-letter alias `ccs` (`ccs ui`, `ccs theme`, `ccs preview`).
- **Color Themes**: 4 built-in palettes: `default` (standard ANSI), `catppuccin` (Mocha TrueColor), `nord`, and `tokyo` (Tokyo Night).
- **Model Aliases**: Automatically strips trailing date suffixes (e.g. `claude-3-7-sonnet-20250219` becomes `claude-3-7-sonnet`) and supports user-defined name mappings.
- **Code Velocity Tracker**: Tracks added and removed lines (`+185/-32`) in real time.
- **Prompt Cache Monitoring**: Displays prompt cache hit percentage (`Cache:92%`).
- **Rate Limit Quotas**: Tracks 5-hour, 7-day, and monthly usage limits with remaining time countdowns.
- **MCP Server Counter**: Scans user settings and project configs for active MCP servers.
- **Dual-Line Mode**: Supports splitting output across two lines (`lines: 2`) for narrow or split terminal layouts.
- **JSONC Config**: Configuration file supports line comments (`//`), block comments (`/* */`), and trailing commas.

---

## Installation

### Method 1: Global Install via npm (Recommended)

```bash
npm install -g claude-code-status

# Auto-configure ~/.claude/settings.json
ccs install
# Or use the full command name:
claude-code-status install
```

After installation, use `ccs` to manage settings:
```bash
ccs ui                   # Choose UI style
ccs theme catppuccin     # Switch color theme (default, catppuccin, nord, tokyo)
ccs delimiter /          # Set separator character
ccs preview              # Preview layouts and themes
ccs uninstall            # Remove statusline from Claude Code settings
```

### Method 2: npx (Without Installation)

```bash
npx claude-code-status install
```

### Method 3: From Source

```bash
git clone https://github.com/PipiCraft/claude-code-status.git
cd claude-code-status
node ./bin/cli.js install
```

---

## Themes & Styling

### Color Themes
```bash
ccs theme default      # Standard ANSI 16-color
ccs theme catppuccin   # Catppuccin Mocha TrueColor
ccs theme nord         # Nord TrueColor
ccs theme tokyo        # Tokyo Night TrueColor
```

### Separator Character
```bash
ccs delimiter /     # Slash: claude-3-7-sonnet / [██░░░░░░] ...
ccs delimiter "•"   # Bullet: claude-3-7-sonnet • [██░░░░░░] ...
ccs delimiter "|"   # Pipe (default)
```

---

## Configuration

On first run or after `ccs install`, an annotated config file is generated at `~/.claude/statusline.config.json`.

```jsonc
{
  // 1. Fields to display and their order.
  // Uncomment any optional field to enable it.
  "fields": [
    "model",        // Model name
    "context",      // Context window tokens and progress bar
    "project",      // Current directory name
    "git",          // Git branch and dirty marker
    // "cost",      // Session cost (supports USD, CNY, and multiplier)
    // "rate_limit",// Quota percentage and reset countdown
    // "cache",     // Prompt cache hit rate
    // "lines",     // Lines added/removed count
    // "mcp",       // Connected MCP server count
    // "effort",    // Reasoning effort level
    // "output_style" // Output style tag
  ],

  // 2. Display lines (1 for single line, 2 for dual line)
  "lines": 1,

  // 3. Git status settings
  "showGitAheadBehind": false, // Show upstream diff arrows (e.g. main ↑2 ↓1*)
  "gitCacheTtl": 2,            // Cache duration in seconds (0 = disabled)

  // 4. Context window size limit (0 = auto-detect)
  "contextWindowSize": 0,

  // 5. Cost and currency
  "currency": "USD",          // "USD", "CNY", or "BOTH"
  "costMultiplier": 1.0,      // Multiplier for proxy/reseller rates
  "exchangeRate": 7.25,       // USD to CNY exchange rate
  "showCostMultiplier": false,

  // 6. Rate limits
  "rateLimitWindows": ["5h", "7d", "mo"],
  "showRateLimitCountdown": true,

  // 7. Visual styling
  "delimiter": "|",
  "icons": "none",            // "none" or "unicode"
  "progressBar": true,
  "progressBarLength": 8,
  "warningThreshold": 80,
  "dangerThreshold": 90,

  // 8. Terminal colors
  "colors": true,

  // 9. Palette theme ("default", "catppuccin", "nord", "tokyo")
  "theme": "default",

  // 10. Model alias mapping
  "modelAliases": {
    // "claude-3-7-sonnet": "Sonnet 3.7",
    // "claude-3-5-haiku": "Haiku 3.5"
  }
}
```

### Available Fields

| Field Name | Description | Default | Example |
| :--- | :--- | :---: | :--- |
| `model` | Model name (cleans date suffixes, supports aliases) | Enabled | `claude-3-7-sonnet` or `Sonnet 3.7` |
| `context` | Context window usage with progress bar | Enabled | `[██░░░░░░] 29% (58.0k/200.0k)` |
| `project` | Current directory name | Enabled | `your-project` |
| `git` | Git branch and dirty marker (cached) | Enabled | `main*` or `main ↑2 ↓1*` |
| `cost` | Session cost (USD / CNY / multiplier) | Optional | `$0.18 (¥1.34)` |
| `rate_limit` | Quota usage and reset countdown | Optional | `5h:28%(2h14m)` |
| `cache` | Prompt cache hit rate | Optional | `Cache:92%` |
| `lines` | Code velocity (lines added and removed) | Optional | `+185/-32` |
| `mcp` | Configured MCP server count | Optional | `MCP:2` |
| `effort` | Reasoning effort level | Optional | `[effort: high]` |
| `output_style` | Output style tag | Optional | `[concise]` |

---

## License

[MIT License](LICENSE)
