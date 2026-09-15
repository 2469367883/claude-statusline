# claude-code-status (ccs)

A lightweight, zero-dependency statusline and observability tool for [Claude Code](https://github.com/anthropics/claude-code).

[中文说明](#中文说明) | [English](#preview)

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

## Comparison with Alternatives

There are several community statusline implementations for Claude Code. Below is an objective comparison of their design trade-offs:

| Dimension | `claude-code-status` (This tool) | `ccstatusline` | Bash scripts (`claude-code-statusline`) | `CCometixLine` |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime & Deps** | Node.js built-ins (0 dependencies) | React + Ink (`node_modules`) | Bash + `jq` | Rust compiled binary |
| **Render Latency** | 1~3 ms | 40~100 ms | < 15 ms | < 1 ms |
| **Windows Support** | Native (PowerShell / CMD) | Native | Requires WSL or Git Bash | Native (WinGet / Binary) |
| **Git Performance** | On-disk TTL cache + timeout | Subprocess spawned every render | Subprocess spawned every render | Native Git calls |
| **Large Log Safety** | Reads tail 64KB in reverse buffer | Varies | Full-file read via `jq` | Native handling |
| **Currency & Proxy** | USD, CNY, and custom multipliers | USD only | USD only | USD only |
| **Configuration** | JSONC with comments & CLI switcher | TS/JS config file | Environment variables / script edit | TOML / Interactive TUI |

### Key Advantages

1. **Zero External Dependencies**: Uses only standard Node.js APIs (`fs`, `path`, `child_process`, `crypto`). If you have Claude Code installed, you already have Node.js. No build step, no npm dependency tree to maintain.
2. **Low Latency on High-Frequency Redraws**: Claude Code executes the statusline command as a fresh subprocess on every terminal redraw. Keeping execution time around 1~3ms prevents typing stutter.
3. **Subprocess-Safe Git Integration**: In large repositories, running `git status` repeatedly can slow down the terminal. This tool caches Git status output in the OS temp directory with a short TTL (default 2s) and enforces a 2-second timeout.
4. **Memory-Safe Transcript Fallback**: When token usage needs to be retrieved from session transcripts, it reads only the last 64KB chunk from the end of the file instead of reading entire multi-megabyte JSONL files into memory.
5. **Cross-Platform Native**: Runs identically across Windows (PowerShell/CMD), macOS, and Linux without requiring `bash`, `jq`, or WSL.
6. **Dual Currency & Proxy Pricing**: Supports USD, CNY, or both simultaneously, with a custom multiplier (`costMultiplier`) for users routing through API proxies or resellers.

---

## Features

- **Minimal Defaults**: Shows model name, context window usage with progress bar, current directory, and Git branch.
- **Short CLI Alias**: Installed as `claude-code-status` with a 3-letter alias `ccs` (`ccs ui`, `ccs theme`, `ccs preview`).
- **Color Themes**: 4 built-in palettes: `default` (standard ANSI), `catppuccin` (Mocha), `nord`, and `tokyo` (Tokyo Night).
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

## 中文说明

针对 Claude Code 终端的状态栏与指标展示工具。

### 为什么写这个工具

社区里现有的 Claude Code 状态栏工具有两类典型做法：
- 一类使用 Shell + `jq` 脚本编写（例如部分单文件配置）。这类脚本在 macOS 或 Linux 上较轻，但在 Windows 下需要借助 Git Bash 或 WSL 才能运行，处理汇率、倒计时以及复杂路径时也容易出现兼容性问题。
- 另一类采用类似 React + Ink 的框架构建。虽然视觉效果华丽，但引入了较重的 `node_modules` 依赖树。由于状态栏是终端每次输出或重绘时都会独立启动的子进程，框架开销容易导致几十毫秒的启动延迟。

`claude-code-status` 采用纯 Node.js 原生 API 实现，定位在两者之间寻找平衡：

1. **无外部依赖**：只要安装了 Claude Code，机器上就已经具备 Node.js 环境，无需额外安装任何第三方包或系统工具。
2. **低延迟启动**：单次渲染耗时控制在 1~3ms，避免频繁刷新造成终端打字卡顿。
3. **跨平台支持**：在 Windows（PowerShell / CMD）、macOS 和 Linux 上行为一致，开箱即用。
4. **大仓库 Git 保护**：通过临时目录对 `git status` 输出进行短时间缓存（默认 2 秒），并设置了超时熔断，防止在大型代码库中反复 fork 进程引起卡顿。
5. **安全读取大日志**：在从会话日志读取 Token 消耗时，仅分块倒序读取文件末尾 64KB，避免在长时间会话中一次性将几十兆的 JSONL 读入内存。
6. **符合国内使用场景**：内置人民币与美元双币种换算，支持自定义倍率（`costMultiplier`），方便使用中转 API 的开发者准确核算费用。

### 快速上手

```bash
# 全局安装
npm install -g claude-code-status

# 自动写入 ~/.claude/settings.json 配置
ccs install
```

日常管理可直接使用短别名 `ccs`：
- `ccs ui`：交互式选择排版样式（单行、双行、无色纯文本、原生 Unicode 符号）。
- `ccs theme <name>`：切换调色板（`default`, `catppuccin`, `nord`, `tokyo`）。
- `ccs delimiter <char>`：修改分隔符（如 `/` 或 `•`）。
- `ccs preview`：在终端预览全部排版和主题效果。
- `ccs uninstall`：安全移除相关配置。

### 配置文件说明

首次运行会在 `~/.claude/statusline.config.json` 自动生成带注释的配置文件。该文件采用宽容的 JSONC 解析，支持 `//` 与 `/* */` 注释，也允许尾随逗号。想要开启某项可选指标（如费用、限额、缓存命中率等），直接删除对应行前面的注释即可。

---

## License

[MIT License](LICENSE)
