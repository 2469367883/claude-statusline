# Claude Code Statusline

Claude Code 自定义状态栏（Status Line）。在启动会话时实时显示：**模型名、上下文用量、当前项目、git 分支及脏状态**（必要时展示输出样式标记），各段用 `|` 分隔。

## 效果预览

```
deepseek-v4-flash | 2% (23.5k/1.0M) | your-project | main*
```

从左到右依次是：

| 段落 | 含义 |
|---|---|
| `deepseek-v4-flash` | 当前模型名（自动去掉版本后缀） |
| `2% (23.5k/1.0M)` | 上下文用量：百分比在前，括号内为 used/total |
| `your-project` | 当前工作目录的项目名 |
| `main*` | git 分支名；`*` 表示有未提交改动 |

### 功能细节

- **🔴 上下文用量≥80% 高亮**：当上下文用量超过 80% 时，百分比与数值转为**黄色**，提醒接近窗口上限。
- **📎 输出样式标记**：若启用了非默认的输出样式（如 `concise`），状态栏末尾会显示 `[样式名]` 标记，便于区分当前会话的输出模式。
- **非 git 目录自动降级**：工作目录不属于 git 仓库时，分支段自动隐藏，不会报错。
- **JSON 解析容错**：stdin 异常时优雅降级，只显示模型名与项目名，不影响终端渲染。

### 上下文用量的字段口径

- 优先取 API 实时返回的 `total_input_tokens`（与 `/context` 同源），避免使用可能整十步进的 `used_percentage` 导致"取整"失真。
- used 与 total 各自独立选择单位（≥100 万显示 `M`，否则 `k`），最大程度避免 `0.1M` 这类反直觉显示。

---

## 安装

### 1. 放置脚本文件

把本仓库中的 `statusline.js` 和 `statusline-entry.sh` 两个文件放到 Claude Code 的全局脚本目录：

```bash
mkdir -p ~/.claude/scripts
cp statusline.js statusline-entry.sh ~/.claude/scripts/
```

> 入口脚本内部引用 `statusline.js` 的路径固定为 `~/.claude/scripts/statusline.js`，所以**必须**放在这个位置，不要改名或挪到别处。

### 2. 配置 settings.json

在 `~/.claude/settings.json` 中加入 `statusLine` 配置：

```json
{
  "statusLine": {
    "command": "sh \"${HOME-}/.claude/scripts/statusline-entry.sh\"",
    "type": "command"
  }
}
```

保存后重启（或新开）Claude Code 会话，状态栏即生效。

---

## 依赖

- **Node.js**：`statusline.js` 用 Node 渲染。入口脚本会通过 `command -v node` 自动探测 node；若找不到，回退到 Windows 常见路径 `/c/Program Files/nodejs/node`。
- **git**：用于读取当前分支与脏状态（非 git 目录时略过该段，不影响其他显示）。

## 兼容性

- 跨平台：入口脚本用 `command -v node` 自动定位 node，Windows / macOS / Linux 通用。
- 独立终端与 Orca 内均可显示：脚本自动检测 Orca 环境，存在 `ORCA_AGENT_HOOK_PORT` 时同时转发给 Orca 集成链。

---

## 开发与调试

想本地预览状态栏输出，可手工喂一份会话 JSON：

```bash
echo '{"workspace":{"current_dir":"/some/dir"},"model":{"display_name":"deepseek-v4-flash[1M]"},"context_window":{"total_input_tokens":23512,"context_window_size":1000000},"output_style":{"name":"default"}}' \
  | node ~/.claude/scripts/statusline.js
```

输出含 ANSI 颜色码，预览时可 `| cat -v` 查看原始内容。
