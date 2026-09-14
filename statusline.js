#!/usr/bin/env node
// Claude Code 全局状态栏(不依赖 Orca,独立终端可用)
// stdin: Claude Code 传入的会话 JSON;stdout: 状态栏文本(支持 ANSI 颜色)
const path = require("path");

const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    // stdin 不是合法 JSON 时仍渲染基础信息
  }

  const cwd = input.workspace?.current_dir || input.cwd || process.cwd();
  const project = path.basename(cwd);

  // 模型显示名:去掉注册名后缀
  const modelRaw = input.model?.display_name || input.model?.id || "Claude";
  const model = modelRaw.replace(/\[.*\]$/, "");

  // 上下文窗口用量:优先取 stdin 的 context_window;
  // 2.1.266 的字段是 {total_input_tokens, context_window_size, used_percentage, remaining_percentage,
  //   current_usage:{input_tokens, cache_*, output_tokens}},没有 used_tokens/total_tokens;
  // 字段全缺时(老版本/异常)从 transcript 的最近一条 usage 记录估算,总窗口按 200k 计
  let usedTokens = null;
  let totalTokens = null;
  const ctx = input.context_window;
  if (ctx && typeof ctx === "object") {
    if (typeof ctx.total_input_tokens === "number" && typeof ctx.context_window_size === "number" && ctx.context_window_size > 0) {
      // 与 `/context` 同源:用 API 实时返回的输入 token 数,而非可能整十步进的 used_percentage
      usedTokens = ctx.total_input_tokens;
      totalTokens = ctx.context_window_size;
    } else if (typeof ctx.used_percentage === "number" && typeof ctx.context_window_size === "number" && ctx.context_window_size > 0) {
      // 兜底:老版本/异常时 total_input_tokens 缺失,才用百分比推算
      totalTokens = ctx.context_window_size;
      usedTokens = Math.round((ctx.used_percentage / 100) * totalTokens);
    } else if (typeof ctx.used_tokens === "number" && typeof ctx.total_tokens === "number" && ctx.total_tokens > 0) {
      // 兼容官方文档中的 used_tokens/total_tokens 写法
      usedTokens = ctx.used_tokens;
      totalTokens = ctx.total_tokens;
    }
  }
  if (usedTokens === null && input.transcript_path) {
    try {
      const fs = require("fs");
      const lines = fs.readFileSync(input.transcript_path, "utf8").split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i] || lines[i].indexOf('"usage"') === -1) continue;
        try {
          const rec = JSON.parse(lines[i]);
          const u = rec.message && rec.message.usage;
          if (u) {
            usedTokens = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
            totalTokens = 200000;
            break;
          }
        } catch {}
      }
    } catch {}
  }
  // 构造上下文用量展示字符串:百分比在前,具体数值在括号内
  let contextStr = null;
  if (typeof usedTokens === "number" && typeof totalTokens === "number" && totalTokens > 0) {
    // used 与 total 各自独立选单位:避免大窗口把 used 也折算成 M 而出现 0.1M 这种反直觉显示
    const usedUnit = usedTokens >= 1000000 ? "M" : "k";
    const totalUnit = totalTokens >= 1000000 ? "M" : "k";
    const usedDisplay = usedUnit === "M"
      ? (usedTokens / 1000000).toFixed(1)
      : (usedTokens / 1000).toFixed(1);
    const totalDisplay = totalUnit === "M"
      ? (totalTokens / 1000000).toFixed(1)
      : (totalTokens / 1000).toFixed(1);
    const pct = Math.round((usedTokens / totalTokens) * 100);
    const color = pct >= 80 ? YELLOW : DIM;
    contextStr = `${color}${pct}% (${usedDisplay}${usedUnit}/${totalDisplay}${totalUnit})${RESET}`;
  }

  const parts = [];

  parts.push(`${GREEN}${model}${RESET}`);

  // 上下文用量在模型名之后、项目名之前
  if (contextStr) parts.push(contextStr);

  parts.push(`${CYAN}${project}${RESET}`);

  // git 分支与脏状态(单次调用同时取分支与变更数)
  let gitInfo = "";
  try {
    const { execFileSync } = require("child_process");
    const out = execFileSync("git", ["-C", cwd, "status", "--porcelain", "--branch"], {
      timeout: 1500,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    const lines = out.split("\n");
    const branch = ((lines[0] || "").match(/^## (?:No commits yet on )?(\S+?)(?:\.\.\.|\s|$)/) || [])[1];
    if (branch) {
      const dirty = lines.slice(1).some((l) => l.trim().length > 0);
      gitInfo = branch + (dirty ? "*" : "");
    }
  } catch {
    // 非 git 目录则不显示
  }
  if (gitInfo) parts.push(`${MAGENTA}${gitInfo}${RESET}`);

  // 输出样式(如已设置;新版本是对象,老版本是字符串)
  const styleName = typeof input.output_style === "string"
    ? input.output_style
    : input.output_style?.name;
  if (styleName && styleName !== "default") {
    parts.push(`${DIM}[${styleName}]${RESET}`);
  }

  // 各段之间用弱化的 `|` 分隔
  process.stdout.write(parts.join(` ${DIM}|${RESET} `));
});
