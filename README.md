# claude-code-status (ccs)

轻量、零依赖的 [Claude Code](https://github.com/anthropics/claude-code) 终端状态栏工具。

简体中文 | [English](README.en.md)

---

## 效果预览

### 默认模式 (核心 4 字段极简风)
```text
claude-3-7-sonnet | [██░░░░░░] 29% (58.0k/200.0k) | your-project | main*
```

### 完整特性模式 (取消注释全部可选特性后)
```text
Sonnet 3.7 | [██░░░░░░] 29% (58.0k/200.0k) | $0.18 (¥1.34) | 5h:28%(2h14m) | Cache:92% | your-project | main* | +185/-32 | MCP:2 | [effort: high]
```

---

## 核心设计与优势亮点

状态栏是终端在高频输入、命令执行和会话交互时反复被调用的子进程。`claude-code-status` 的设计核心是**极速的冷启动响应**、**零维护成本**与**稳定的跨平台表现**：

- **零外部依赖 (Zero Dependencies)**：仅使用 Node.js 原生内置模块（`fs`、`path`、`child_process`、`crypto`）。只要机器上能运行 Claude Code，就无需下载任何第三方包或配置额外运行环境。
- **1~3ms 低延迟启动**：由于状态栏每次重绘都会以新进程拉起，几毫秒内的执行耗时能彻底避免终端打字过程中的掉帧和迟滞感。
- **原生跨平台兼容**：在 Windows（PowerShell / CMD）、macOS 和 Linux 上开箱即用，无需安装 `bash`、`jq` 或 WSL，无论路径分隔符还是终端字符编码均原生适配。
- **大型代码库 Git 保护**：在超大单体仓库中，高频调用 `git status` 极易拖慢终端。本项目通过系统临时目录提供短时缓存（默认 2 秒 TTL），并配置了 2 秒超时熔断，兼顾信息实时性与系统流畅度。
- **安全读取大日志**：在回退读取会话 Token 消耗时，通过底层反向分块读取（仅读末尾 64KB 缓冲区），彻底规避长时间大对话产生数十兆 JSONL 文件时导致的内存暴涨与 I/O 阻塞。
- **国内网络与中转计费适配**：内置 USD / CNY 汇率换算与中转代理加价倍率（`costMultiplier`），支持自定义模型别名映射，贴合国内开发者的实际使用场景。

---

## 功能特性

- **精简默认项**：默认仅展示最核心的 4 项：模型名称、上下文进度条、项目目录名、Git 分支与脏状态。
- **极客短命令 `ccs`**：全局安装后支持使用 3 字符短别名 `ccs` 进行全部操作（`ccs ui`、`ccs theme`、`ccs preview`）。
- **色彩主题预设**：内置 4 套精调调色板：`default`（标准兼容 ANSI）、`catppuccin`（Mocha 柔和马卡龙）、`nord`（北极光冷淡蓝灰）、`tokyo`（Tokyo Night 赛博暗夜）。
- **模型别名与美化**：自动剥离模型名称末尾的冗长日期后缀（如 `claude-3-7-sonnet-20250219` 自动简化为 `claude-3-7-sonnet`），并支持在配置文件中设置个性化别名。
- **代码吞吐量统计**：实时统计会话增删代码行数（`+185/-32`）。
- **Prompt 缓存监控**：展示 Prompt Cache 缓存命中率（`Cache:92%`）。
- **多周期限额监控**：支持 5 小时、7 天、月度限额百分比监控及额度回满倒计时（`5h:28%(2h14m)`）。
- **MCP 服务扫描**：自动扫描用户全局与项目级配置中连接的 MCP 服务数量（`MCP:2`）。
- **双行排版折叠**：支持单行（`lines: 1`）与双行（`lines: 2`）自由折叠，优化多分屏与窄屏终端的显示效果。
- **宽容的 JSONC 配置**：配置文件支持 `//` 单行注释、`/* */` 多行注释与尾随逗号。

---

## 安装与使用

### 方式 1: npm 全局安装 (推荐)

```bash
npm install -g claude-code-status

# 自动写入 ~/.claude/settings.json 配置
ccs install
# 亦可使用完整命令名:
claude-code-status install
```

安装后，您可以在终端任意位置直接使用 **`ccs`** 命令：
```bash
ccs ui                   # 交互式选择排版风格 (单行、双行、无色纯文本、原生 Unicode 符号)
ccs theme catppuccin     # 切换色彩主题 (default, catppuccin, nord, tokyo)
ccs delimiter /          # 自定义分隔符号 (如 / 或 •)
ccs preview              # 终端全场景效果预览
ccs uninstall            # 从 Claude Code 设置中安全移除状态栏配置
```

### 方式 2: npx 免安装运行

```bash
npx claude-code-status install
```

### 方式 3: Git 源码克隆

```bash
git clone https://github.com/PipiCraft/claude-code-status.git
cd claude-code-status
node ./bin/cli.js install
```

---

## 主题与排版

### 切换调色板主题
```bash
ccs theme default      # 经典标准 ANSI 16 色 (高兼容)
ccs theme catppuccin   # Mocha 柔和马卡龙 24-bit TrueColor
ccs theme nord         # 北极光冷淡蓝灰 24-bit TrueColor
ccs theme tokyo        # Tokyo Night 赛博暗夜 24-bit TrueColor
```

### 修改分隔符 (Delimiter)
```bash
ccs delimiter /     # 斜杠分隔: claude-3-7-sonnet / [██░░░░░░] ...
ccs delimiter "•"   # 圆点分隔: claude-3-7-sonnet • [██░░░░░░] ...
ccs delimiter "|"   # 竖线分隔 (默认)
```

---

## 配置说明

首次运行或执行 `ccs install` 时，会在 `~/.claude/statusline.config.json` 自动生成带完整注释的配置文件。

配置文件默认支持 `//` 注释与尾随逗号：

```jsonc
{
  // 1. 字段显示与排列顺序 (默认开启核心 4 项，其余取消注释即可启用)
  "fields": [
    "model",        // 模型名称 (自动清理日期，支持别名)
    "context",      // 上下文使用量及进度条
    "project",      // 当前项目目录名
    "git",          // Git 分支与脏状态标记
    // "cost",      // 会话费用 (支持 USD / CNY 及加价倍率)
    // "rate_limit",// 限额配额与回满倒计时
    // "cache",     // Prompt Cache 缓存命中率
    // "lines",     // 会话代码增删吞吐量统计
    // "mcp",       // 已连接的 MCP 服务数量
    // "effort",    // 思考级别/推理强度
    // "output_style" // 输出风格标签
  ],

  // 2. 终端显示行数 (1 为单行，2 为双行)
  "lines": 1,

  // 3. Git 状态设置
  "showGitAheadBehind": false, // 是否显示与远端分支的上下游同步差异 (如 main ↑2 ↓1*)
  "gitCacheTtl": 2,            // Git 状态磁盘缓存秒数 (0 为每次实时读取)

  // 4. 上下文上限 Token 数 (0 为自动跟随智能体实际配置)
  "contextWindowSize": 0,

  // 5. 费用与汇率计算
  "currency": "USD",          // 货币单位: "USD", "CNY", 或 "BOTH"
  "costMultiplier": 1.0,      // 计费倍率 (中转站/代理加价倍率)
  "exchangeRate": 7.25,       // 美元兑人民币汇率
  "showCostMultiplier": false,

  // 6. 配额限额显示
  "rateLimitWindows": ["5h", "7d", "mo"],
  "showRateLimitCountdown": true,

  // 7. 外观风格与分隔符
  "delimiter": "|",
  "icons": "none",            // 图标风格: "none" (纯文本), "unicode" (原生字符)
  "progressBar": true,
  "progressBarLength": 8,
  "warningThreshold": 80,
  "dangerThreshold": 90,

  // 8. 终端颜色控制 (设为 false 彻底关闭所有颜色转义)
  "colors": true,

  // 9. 色彩主题预设 ("default", "catppuccin", "nord", "tokyo")
  "theme": "default",

  // 10. 模型名称自定义别名映射
  "modelAliases": {
    // "claude-3-7-sonnet": "Sonnet 3.7",
    // "claude-3-5-haiku": "Haiku 3.5"
  }
}
```

### 可用指标字段清单

| 字段名称 | 描述说明 | 默认状态 | 示例效果 |
| :--- | :--- | :---: | :--- |
| `model` | AI 模型名称 (自动清理日期，支持别名) | 开启 | `claude-3-7-sonnet` 或 `Sonnet 3.7` |
| `context` | 上下文使用量及进度条 (支持反向块读取) | 开启 | `[██░░░░░░] 29% (58.0k/200.0k)` |
| `project` | 当前工作区项目目录名 | 开启 | `your-project` |
| `git` | Git 分支与状态 (带磁盘 TTL 短时缓存) | 开启 | `main*` 或 `main ↑2 ↓1*` |
| `cost` | 会话费用 (USD / CNY / 代理加价倍率) | 可选 | `$0.18 (¥1.34)` |
| `rate_limit` | 5小时/7天/月度限额与倒计时 | 可选 | `5h:28%(2h14m)` |
| `cache` | Prompt Cache 命中率百分比 | 可选 | `Cache:92%` |
| `lines` | 代码吞吐量 (行数增删) | 可选 | `+185/-32` |
| `mcp` | 已注册的 MCP 工具服务数 (多源扫描) | 可选 | `MCP:2` |
| `effort` | 思考/推理强度级别 | 可选 | `[effort: high]` |
| `output_style` | 输出风格标签 | 可选 | `[concise]` |

---

## 开源协议

[MIT License](LICENSE)
