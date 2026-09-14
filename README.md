# claude-statusline

> A clean, ultra-fast and **zero-dependency** statusline for [Claude Code](https://github.com/anthropics/claude-code).

[中文说明](#中文文档) | [English](#preview)

---

## Preview

```text
claude-3-7-sonnet | 24% (48.0k/200.0k) | your-project | main*
```

Segments from left to right:
1. **Model**: Active model name (e.g. `claude-3-7-sonnet`, register suffixes stripped)
2. **Context Tokens**: Used percentage and token counts `24% (48.0k/200.0k)` (turns yellow if usage >= 80%)
3. **Project**: Current working directory project name
4. **Git Info**: Branch name and dirty marker (`*` indicates uncommitted changes)
5. **Output Style**: Tagged if non-default (e.g. `[concise]`)

---

## Features

- ⚡ **Zero-Dependency**: Pure native Node.js, uses only built-in APIs (`fs`, `path`, `child_process`).
- 🚀 **Ultra-Fast**: Non-blocking, executes in ~30ms, no network latency.
- 💻 **Cross-Platform**: Works seamlessly across Windows, macOS, and Linux without external shell dependencies (`sh`/`bash`).
- 🎯 **One-Command Setup**: Built-in CLI for instant install, uninstall and preview.

---

## Installation

### Option 1: Global npm / npx (Recommended)

```bash
# Run one-line setup:
npx claude-statusline install
```

This automatically updates your `~/.claude/settings.json` with a backup created.

To uninstall:
```bash
npx claude-statusline uninstall
```

### Option 2: Clone from Git

```bash
git clone https://github.com/your-username/claude-statusline.git
cd claude-statusline
node ./bin/cli.js install
```

### Option 3: Manual Configuration

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "command": "node \"<path-to-claude-statusline>/bin/statusline.js\"",
    "type": "command"
  }
}
```

---

## CLI Commands

```bash
# Preview statusline with mock data in terminal
npx claude-statusline preview

# Auto configure settings.json
npx claude-statusline install

# Remove statusline configuration
npx claude-statusline uninstall
```

---

## <a id="中文文档"></a>中文文档

Claude Code 自定义状态栏工具。在 Claude 会话中实时显示：**模型名、上下文用量、当前项目名、Git 分支与脏状态**，各段使用弱化 `|` 分隔。

### 特性亮点

- ⚡ **零第三方依赖**：纯 Node.js 原生实现，体积极小，秒级运行；
- 🚀 **极速无感知**：冷启动 <40ms，不产生任何网络请求或终端卡顿；
- 💻 **全平台通用**：原生支持 Windows、macOS 与 Linux，无需安装 Git Bash 或额外 Shell 环境；
- 🔴 **高用量预警**：当上下文用量超过 80% 时，用量信息自动显示为**黄色高亮**提醒；
- 🛠 **自带 CLI 管理器**：内置 `install` 一键安装/备份、`preview` 效果预览、`uninstall` 干净卸载。

### 许可证

[MIT License](LICENSE)
