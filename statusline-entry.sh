#!/bin/sh
# Claude Code 全局状态栏统一入口
# - 始终用本地 node 脚本渲染 TUI 状态栏(独立终端与 Orca 内都显示)
# - 在 Orca 内启动时(存在 ORCA_AGENT_HOOK_PORT),同时把同一份 stdin 转发给 Orca 集成链
# 优先用 PATH 自动探测 node(跨平台通用);找不到再回退到 Windows 常见安装路径
NODE="$(command -v node 2>/dev/null)"
if [ -z "${NODE}" ]; then
  NODE="/c/Program Files/nodejs/node"
fi
if [ -n "${ORCA_AGENT_HOOK_PORT-}" ] && [ -n "${ORCA_PANE_KEY-}" ] && [ -f "${HOME-}/.orca/agent-hooks/claude-statusline.cmd" ]; then
  tmp="$(mktemp "${TMPDIR:-/tmp}/claude-statusline-XXXXXX.tmp")"
  cat >"$tmp"
  "${HOME-}/.orca/agent-hooks/claude-statusline.cmd" <"$tmp" >/dev/null 2>&1
  "$NODE" "${HOME-}/.claude/scripts/statusline.js" <"$tmp"
  rm -f "$tmp"
else
  cat | "$NODE" "${HOME-}/.claude/scripts/statusline.js"
fi
