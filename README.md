# claude-code-status (ccs)

> A clean, ultra-fast and **zero-dependency** statusline and observability suite for [Claude Code](https://github.com/anthropics/claude-code).

[中文说明](#中文文档) | [English](#preview)

---

## Preview

### Default Out-of-the-Box Mode (核心 4 字段极简风)
```text
claude-3-7-sonnet | [██░░░░░░] 29% (58.0k/200.0k) | your-project | main*
```

### Full Suite Enabled (取消注释全部可选特性后)
```text
Sonnet 3.7 | [██░░░░░░] 29% (58.0k/200.0k) | $0.18 (¥1.34) | 5h:28%(2h14m) | Cache:92% | your-project | main* | +185/-32 | MCP:2 | [effort: high]
```

---

## Features

- ⚡ **Zero-Dependency**: Pure native Node.js, uses only built-in APIs (`fs`, `path`, `child_process`).
- 🚀 **Ultra-Fast**: Render logic runs in 1~3 milliseconds with zero network latency. The only subprocess is `git status`, cached on disk by default (`gitCacheTtl`).
- 🎯 **Clean Defaults**: Shows only core essentials by default: **Model Name**, **Context Window & Progress Bar**, **Project Directory**, and **Git Branch**.
- ⌨️ **Ultra-Short Alias**: Full command `claude-code-status` plus handy 3-letter alias **`ccs`** (`ccs ui`, `ccs theme`, `ccs preview`).
- 🎨 **Color Themes**: 4 built-in palettes: `default` (ANSI 16-color), `catppuccin` (Mocha TrueColor), `nord` (TrueColor), `tokyo` (Tokyo Night TrueColor).
- 🏷 **Model Aliases**: Auto-cleans long date suffixes (e.g. `claude-3-7-sonnet-20250219` -> `claude-3-7-sonnet`) and supports custom alias mappings (`"Sonnet 3.7"`).
- 📝 **Auto Config Generation**: Automatically creates an annotated `~/.claude/statusline.config.json` on first run if missing.
- 🎨 **Custom Delimiter**: Freely configure any separator symbol (`|`, `/`, `•`, `::`, `-`), default is `|`.
- 🎨 **Interactive UI Presets**: `ccs ui` for switching between monochrome, icons, and dual-line modes.
- 📈 **Code Velocity Tracker**: Real-time counter of lines added and removed (`+185/-32`).
- ⚡ **Prompt Cache Hit Rate**: Monitor cache efficiency and savings (`Cache:92%`).
- ⏱ **Multi-Quota & Countdown**: 5-hour, 7-day, and monthly quota monitoring with reset countdown (`5h:28%(2h14m)`).
- 🌿 **Smart Git Integration**: Simple clean `main*` by default; optional remote sync tracking (`main ↑2 ↓1*`). `git status` output is cached on disk.
- 🔌 **MCP Server Monitor**: Displays active/configured MCP server count (`MCP:2`) across global and project configs.
- 📄 **Dual-Line Layout**: Switch between single-line and dual-line mode (`lines: 2`) for split or narrow terminal windows.
- 💱 **Currency & Multipliers**: Switch USD/CNY/Both with custom pricing multiplier (`costMultiplier: 1.5`).
- 🎛 **Fully Modular**: Freely select which components to show and in what order by editing the config file.

---

## Installation

### 方式 1: npm 全局安装 (推荐，离线可用，全局常驻)

```bash
# 1. 全局安装到系统:
npm install -g claude-code-status

# 2. 一键自动配置并生成默认配置文件 (二选一):
ccs install
# 或者使用完整命令:
claude-code-status install
```

安装后，您可以在终端任意位置直接输入 **`ccs`** 命令进行快捷管理：
```bash
ccs ui                   # 交互式挑选 UI 风格
ccs theme catppuccin     # 一键切换色彩主题 (default, catppuccin, nord, tokyo)
ccs delimiter /          # 一键切换分割符号 (如 / 或 •)
ccs preview              # 预览全场景效果
ccs uninstall            # 卸载 Claude Code 配置
```

### 方式 2: npx 免安装运行 (即用即下)

```bash
npx claude-code-status install
```

### 方式 3: 从 Git 源码克隆

```bash
git clone https://github.com/PipiCraft/claude-code-status.git
cd claude-code-status
node ./bin/cli.js install
```

---

## Themes & UI Presets (色彩主题与预设)

### 1. 切换调色板主题
支持随时一键无缝热切：
```bash
ccs theme default      # 经典标准 ANSI 16 色
ccs theme catppuccin   # Mocha 柔和马卡龙 24-bit TrueColor
ccs theme nord         # 北极光冷淡蓝灰 24-bit TrueColor
ccs theme tokyo        # Tokyo Night 赛博暗夜 24-bit TrueColor
```

### 2. 交互式 UI 选择器
```bash
ccs ui
```

内置 4 大核心形态：
1. **经典默认 (Default)**: 标准彩色单行，分割符号遵循配置 (默认: `|`)
2. **无色纯简 (Monochrome)**: 彻底关闭 ANSI 颜色转义，纯粹终端单色文本（一点颜色不用）
3. **原生符号 (Unicode Icons)**: 开启系统原生通用符号 (`✦`, `⚡`, `⎇`, `⏱`)，免装字体完美支持
4. **双行分屏 (Dual Line)**: 自动拆为第 1 行模型/上下文，第 2 行目录/Git，分屏窄屏极佳

### 3. 自由修改分割符号 (Delimiter)
```bash
ccs delimiter /     # 斜杠分隔: claude-3-7-sonnet / [██░░░░░░] ...
ccs delimiter "•"   # 圆点分隔: claude-3-7-sonnet • [██░░░░░░] ...
ccs delimiter "|"   # 竖线分隔 (默认)
```

---

## Configuration

首次运行或执行 `install` 时，会自动在 `~/.claude/statusline.config.json` 生成带完整注释的配置文件。

配置文件默认支持 `//` 注释与尾随逗号：

```jsonc
{
  // 1. 字段显示与排列顺序
  // 默认仅显示核心 4 项，想要开启其它特性，直接删除前面的 // 注释即可
  "fields": [
    "model",        // 模型名称 (例如: claude-3-7-sonnet)
    "context",      // 上下文使用量及进度条 (例如: [██░░░░░░] 29% (58k/200k))
    "project",      // 当前项目目录名 (例如: my-project)
    "git",          // Git 分支与修改标记 (例如: main*)
    // "cost",      // 会话费用 (支持 USD / CNY 及加价倍率，例如: ¥1.34 或 $0.18)
    // "rate_limit",// 限额配额与回满倒计时 (例如: 5h:28%(2h14m) 7d:42%(3d3h))
    // "cache",     // Prompt Cache 缓存命中率 (例如: Cache:92%)
    // "lines",     // 会话代码增删吞吐量统计 (例如: +185/-32)
    // "mcp",       // 已连接的 MCP 服务数量 (例如: MCP:2)
    // "effort",    // 思考级别/推理强度 (例如: [effort: high])
    // "output_style" // 输出风格标签 (例如: [concise])
  ],

  // 2. 终端显示行数 (1 为单行，2 为双行)
  "lines": 1,

  // 3. Git 状态显示 (false 为简单 * 标记，true 为展示 ↑ahead ↓behind 远端同步差异)
  "showGitAheadBehind": false,
  // git 状态缓存秒数 (默认 2，0 为每次实时读取)
  "gitCacheTtl": 2,

  // 4. 上下文上限 Token 数 (0 为自动跟随智能体实际大小)
  "contextWindowSize": 0,

  // 5. 费用与汇率计算
  "currency": "USD",
  "costMultiplier": 1.0,
  "exchangeRate": 7.25,
  "showCostMultiplier": false,

  // 6. 配额限额显示
  "rateLimitWindows": ["5h", "7d", "mo"],
  "showRateLimitCountdown": true,

  // 7. 外观风格与分隔符
  "delimiter": "|",
  "icons": "none",
  "progressBar": true,
  "progressBarLength": 8,
  "warningThreshold": 80,
  "dangerThreshold": 90,

  // 8. 终端颜色控制 (设为 false 彻底关闭所有颜色)
  "colors": true,

  // 9. 色彩主题预设 (可选 "default", "catppuccin", "nord", "tokyo")
  "theme": "default",

  // 10. 模型别名自定义映射 (默认自动清理末尾长日期后缀)
  "modelAliases": {
    // "claude-3-7-sonnet": "Sonnet 3.7",
    // "claude-3-5-haiku": "Haiku 3.5"
  }
}
```

### Available Fields

| Field Name | Description | Status by Default | Example |
| :--- | :--- | :--- | :--- |
| `model` | AI 模型名称 (智能去除日期，支持别名) | **开启** | `claude-3-7-sonnet` 或 `Sonnet 3.7` |
| `context` | 上下文使用量与进度条 (支持反向块读取) | **开启** | `[██░░░░░░] 29% (58.0k/200.0k)` |
| `project` | 当前项目目录名 | **开启** | `your-project` |
| `git` | Git 分支与状态 (带磁盘 TTL 缓存) | **开启** | `main*` 或 `main ↑2 ↓1*` |
| `cost` | 会话费用 (USD / CNY / 倍率) | 注释可选 | `$0.18 (¥1.34)` |
| `rate_limit` | 5小时/7天/月度限额与倒计时 | 注释可选 | `5h:28%(2h14m)` |
| `cache` | Prompt Cache 命中率 | 注释可选 | `Cache:92%` |
| `lines` | 代码吞吐量 (行数增删) | 注释可选 | `+185/-32` |
| `mcp` | 已注册的 MCP 工具服务数 (多源扫描) | 注释可选 | `MCP:2` |
| `effort` | 思考/推理级别 | 注释可选 | `[effort: high]` |
| `output_style` | 输出风格标签 | 注释可选 | `[concise]` |

---

## <a id="中文文档"></a>中文说明

Claude Code 终极自定义状态栏与监控套件。

### 设计理念
1. **开箱即用，极简纯粹**：
   - 默认**仅展示最核心的 4 项**：`模型名称`、`上下文进度`、`项目目录`、`Git分支`；
   - 零外部依赖，毫秒级冷启动渲染，无任何卡顿。
2. **极客短别名 `ccs`**：
   - 支持直接使用三字符短命令 `ccs` 进行全部操作（`ccs ui`、`ccs theme`、`ccs preview`）。
3. **高级主题与模型智能美化**：
   - 内置 Catppuccin、Nord、Tokyo Night 高级调色板；
   - 自动剥离模型名称冗长尾巴，支持配置个性化别名。
4. **统一清晰的分割符配置**：
   - 竖线 `|`、斜杠 `/`、圆点 `•` 统一收敛为单个 `"delimiter"` 字段，默认是 `|`，支持随时输入任何符号。
5. **极度宽容的 JSONC 解析器**：
   - 配置文件支持 `//` 单行注释、`/* */` 多行注释与尾随逗号。

### 许可证

[MIT License](LICENSE)
