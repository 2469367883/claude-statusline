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
- **Low-Overhead Design**: Avoids third-party runtimes and daemon background processes, utilizing short-lived Git caching and tail-buffer reading to minimize repeated refresh overhead.
- **Ultra-Fast Latency (1~3ms)**: Because the script is invoked repeatedly on terminal redraws, execution time is kept under 3ms to avoid typing lag or cursor stutter.
- **Native Cross-Platform**: Operates out of the box on Windows (PowerShell and CMD), macOS, and Linux without needing `bash`, `jq`, or WSL.
- **Subprocess-Safe Git Caching**: In large git repositories, running `git status` repeatedly can slow down the terminal. This tool caches `git status` output in the OS temporary directory with a configurable TTL (default: 2s) and enforces a 2-second timeout.
- **Safe Long-Session Transcript Parsing**: When reading context token data from session logs, it reads only the trailing 64KB chunk in reverse buffer rather than loading entire multi-megabyte JSONL files into memory, avoiding memory spikes and significantly reducing I/O and parsing overhead in large conversation sessions.
- **Proxy Multiplier & Multi-Currency Support**: For developers routing Claude Code through third-party API relays, proxies, or resellers where pricing differs from official rates, you can configure a proxy markup multiplier (`costMultiplier`) and currency exchange rate (`exchangeRate`) to calculate and display your actual spend in USD, CNY, or both.

---

## Features

- **Minimal Defaults**: Shows model name, context window usage with progress bar, current directory, and Git branch.
- **Short CLI Alias**: Installed as `claude-code-status` with a 3-letter alias `ccs` (`ccs ui`, `ccs theme`, `ccs preview`).
- **Color Themes**: 4 built-in palettes: `default` (standard ANSI), `catppuccin` (Mocha TrueColor), `nord`, and `tokyo` (Tokyo Night).
- **Model Aliases**: Automatically strips trailing date suffixes (e.g. `claude-3-7-sonnet-20250219` becomes `claude-3-7-sonnet`) and supports user-defined name mappings.
- **Cost Conversion & Proxy Multiplier**: Scales Claude Code's reported `total_cost_usd` by a customizable proxy/relay multiplier (`costMultiplier`, e.g. `1.5`x) and exchange rate (`exchangeRate`), displaying the calculated actual cost in USD, CNY, or both, with an optional multiplier tag (`(x1.5)`; note: calculated from reported cost, not an independent token billing engine).
- **Multi-Window Rate Limits & Burn Rate**: Displays Claude Code's 5-hour, 7-day, and monthly rate limit status with reset countdowns (e.g. `5h:28%(2h14m)`), with optional burn rate velocity trends (`showRateLimitTrend`, `↑` fast / `↓` slow).
- **Session Duration**: Optional runtime clock tracking how long the current session has been active (e.g. `38m`, `1h 24m`).
- **Token Breakdown**: Optional granular breakdown of Input, Cache, and Output tokens (e.g. `I:12k C:320k O:18k`).
- **MCP Server Counter**: Scans user-level and project-level MCP configurations and reports the number of configured MCP servers (e.g. `MCP:2`).
- **Prompt Cache Monitoring**: Displays prompt cache hit percentage (`Cache:92%`).
- **Code Velocity Tracker**: Tracks added and removed lines (`+185/-32`) in real time.
- **Adaptive Auto Layout**: Supports single line (`lines: 1`), dual lines (`lines: 2`), and dynamic wrap based on terminal width (`lines: "auto"`).
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

### Method 2: npx (Quick Trial)

```bash
# Recommended only for quick evaluation or running setup commands
npx claude-code-status install
```

> [!NOTE]
> You can use `npx claude-code-status` for a quick trial or setup, but running `npx` as a permanent statusLine command is **not recommended**. Because the statusline executes every time the prompt redraws, `npx` can introduce noticeable delay from package resolution and network checks. It is great for testing, but not as a permanent configuration.

### Method 3: From Source

```bash
git clone https://github.com/PipiCraft/claude-code-status.git
cd claude-code-status
node ./bin/cli.js install
```

### 💡 Note for CC-Switch Users

If you use [CC-Switch](https://github.com/tiann/cc-switch) to manage and switch Claude Code providers, CC-Switch will rewrite `~/.claude/settings.json` when adding or switching providers. To keep your statusline active across switches, configure it directly in CC-Switch:

1. Click **"Edit"** on any provider card and scroll down to the **very bottom** of the page.
2. Choose one of the following methods to add the statusline config:
   - **Recommended (Global for all providers)**: Click **"Edit Common Config" (编辑通用配置)** at the bottom, add the following snippet into the configuration JSON, and save. CC-Switch will then automatically carry the statusline configuration every time you switch or add a provider:
     ```json
     {
       "statusLine": {
         "type": "command",
         "command": "ccs"
       }
     }
     ```
   - **Current provider only**: Add the `"statusLine"` block directly into the **Configuration JSON** box at the bottom of the edit page and save.

> [!TIP]
> If editing within an existing provider's configuration JSON that already has `"env": { ... }`, simply append the `"statusLine"` block separated by a comma `,`.

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
    // "tokens",    // Token breakdown (e.g. I:12k C:320k O:18k)
    // "session_duration", // Elapsed session runtime (e.g. 38m or 1h 24m)
    // "cost",      // Session cost (scales Claude Code's total_cost_usd by proxy multiplier & exchange rate)
    // "rate_limit",// Displays Claude Code's 5h, 7d, and monthly limits with reset countdowns
    // "cache",     // Prompt cache hit rate
    // "lines",     // Lines added/removed count
    // "mcp",       // Scans user-level and project-level configured MCP server count
    // "effort",    // Reasoning effort level
    // "output_style" // Output style tag
  ],

  // 2. Display lines (1 for single line, 2 for dual line, "auto" for width-adaptive)
  "lines": 1,

  // 3. Git status settings
  "showGitAheadBehind": false, // Show upstream diff arrows (e.g. main ↑2 ↓1*)
  "gitCacheTtl": 2,            // Cache duration in seconds (0 = disabled)

  // 4. Context window size limit (0 = auto-detect)
  "contextWindowSize": 0,

  // 5. Cost calculation & proxy multiplier (scales Claude Code's total_cost_usd, not independent billing)
  "currency": "USD",          // "USD", "CNY", or "BOTH"
  "costMultiplier": 1.0,      // Proxy/relay price multiplier (e.g. 1.2 or 1.5 for third-party API resellers)
  "exchangeRate": 7.25,       // USD to CNY exchange rate
  "showCostMultiplier": false,// Show multiplier badge suffix (e.g. $0.27 (x1.5))

  // 6. Rate limits
  "rateLimitWindows": ["5h", "7d", "mo"],
  "showRateLimitCountdown": true,
  "showRateLimitTrend": false, // Show burn rate trend arrow (↑ fast / ↓ slow)

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
| `tokens` | Token breakdown (Input / Cache / Output) | Optional | `I:12k C:320k O:18k` |
| `session_duration` | Elapsed session runtime duration | Optional | `38m` or `1h 24m` |
| `cost` | Session cost (scales total_cost_usd by proxy multiplier and exchange rate) | Optional | `$0.18 (¥1.34)` or `$0.27 (x1.5)` |
| `rate_limit` | Quota usage, reset countdown, and optional burn rate trend | Optional | `5h:28%(2h14m)` or `5h:72%↑` |
| `cache` | Prompt cache hit rate | Optional | `Cache:92%` |
| `lines` | Code velocity (lines added and removed) | Optional | `+185/-32` |
| `mcp` | Scans user-level and project-level MCP configurations and counts servers | Optional | `MCP:2` |
| `effort` | Reasoning effort level | Optional | `[effort: high]` |
| `output_style` | Output style tag | Optional | `[concise]` |

---

## License

[MIT License](LICENSE)
