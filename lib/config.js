// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * @typedef {Object} StatuslineConfig
 * @property {string[]} [fields] Array of field names controlling which fields to display and their exact order
 * @property {string[]} [line1] Optional explicit fields array for line 1 (in multi-line mode)
 * @property {string[]} [line2] Optional explicit fields array for line 2 (in multi-line mode)
 * @property {number | "auto"} [lines] Number of display lines (1, 2, or "auto", default: 1)
 * @property {boolean} [showGitAheadBehind] Show git ahead/behind arrows e.g. ↑2 ↓1* (default: false, keeps clean * indicator)
 * @property {number} [gitCacheTtl] Seconds to reuse cached `git status` output (default: 2, 0 disables caching)
 * @property {string[]} [rateLimitWindows] Which rate limit cycles to display, e.g. ["5h", "7d", "mo"]
 * @property {boolean} [showRateLimitCountdown] Show countdown until quota resets, e.g. 5h:28%(2h14m)
 * @property {boolean} [showRateLimitTrend] Show rate limit burn rate trend arrows e.g. 5h:72%↑ (default: false)
 * @property {number} [contextWindowSize] Manual context window size override (0 = default follows agent setting)
 * @property {string} [delimiter] Separator character between segments (default: "|")
 * @property {"none" | "unicode"} [icons]
 * @property {"USD" | "CNY" | "BOTH"} [currency] Currency format: "USD" ($), "CNY" (¥), or "BOTH"
 * @property {number} [costMultiplier] Custom pricing multiplier (e.g. 1.0, 1.5, 0.8)
 * @property {number} [exchangeRate] USD to CNY conversion rate (default: 7.25)
 * @property {boolean} [showCostMultiplier] Show multiplier tag e.g. (x1.5)
 * @property {boolean} [progressBar]
 * @property {number} [progressBarLength]
 * @property {number} [warningThreshold]
 * @property {number} [dangerThreshold]
 * @property {"default" | "catppuccin" | "nord" | "tokyo"} [theme] Terminal color palette
 * @property {Record<string, string>} [modelAliases] Custom mapping from model ID to display alias
 * @property {boolean} [colors]
 */

/** @type {string[]} */
const DEFAULT_FIELDS = ["model", "context", "project", "git"];

/** @type {string[]} */
const DEFAULT_RATE_LIMIT_WINDOWS = ["5h", "7d", "mo"];

/** Timeout for the `git status` subprocess in milliseconds. */
const GIT_TIMEOUT_MS = 2000;

/** @type {StatuslineConfig} */
const DEFAULT_CONFIG = {
  fields: DEFAULT_FIELDS,
  lines: 1,
  showGitAheadBehind: false,
  gitCacheTtl: 2,
  rateLimitWindows: DEFAULT_RATE_LIMIT_WINDOWS,
  showRateLimitCountdown: true,
  showRateLimitTrend: false,
  contextWindowSize: 0,
  delimiter: "|",
  currency: "USD",
  costMultiplier: 1.0,
  exchangeRate: 7.25,
  showCostMultiplier: false,
  icons: "none",
  progressBar: true,
  progressBarLength: 8,
  warningThreshold: 80,
  dangerThreshold: 90,
  theme: "default",
  modelAliases: {},
  colors: true,
};

const UI_PRESETS = {
  default: {
    name: "经典默认 (Default)",
    description: "标准单行彩色模式，分割符号遵循 delimiter 配置 (默认: |)",
    config: { icons: "none", colors: true, lines: 1 },
  },
  monochrome: {
    name: "无色纯简 (Monochrome - 一点颜色不用)",
    description: "彻底关闭 ANSI 颜色转义，纯粹终端单色纯文本",
    config: { icons: "none", colors: false, lines: 1 },
  },
  unicode: {
    name: "原生符号 (Unicode Icons - 免装字体)",
    description: "系统原生通用符号 (✦, ⚡, ⎇, ⏱)，免装字体完美支持",
    config: { icons: "unicode", colors: true, lines: 1 },
  },
  dual: {
    name: "双行分屏 (Dual Line - 自动拆为两行)",
    description: "拆分为第 1 行模型/上下文，第 2 行目录/Git，分屏窄屏极佳",
    config: { icons: "none", colors: true, lines: 2 },
  },
};

const DEFAULT_CONFIG_TEMPLATE = `{
  // --------------------------------------------------------------------------
  // Claude Code Statusline 配置文件
  // 支持 // 与 /* */ 注释，以及尾随逗号
  // --------------------------------------------------------------------------

  // 1. 字段显示与排列顺序
  // 默认仅显示最核心的 4 项: 模型名称、上下文大小与进度条、当前目录、Git分支
  // 想要开启其它特性，直接删除前面的 // 注释即可
  "fields": [
    "model",        // 模型名称 (例如: claude-3-7-sonnet)
    "context",      // 上下文使用量及进度条 (例如: [██░░░░░░] 29% (58k/200k))
    "project",      // 当前项目目录名 (例如: my-project)
    "git",          // Git 分支与修改标记 (例如: main*)
    // "tokens",    // Token 消耗明细 (例如: I:12k C:320k O:18k)
    // "session_duration", // 会话运行时间 (例如: 38m 或 1h 24m)
    // "cost",      // 会话费用 (支持 USD / CNY 及加价倍率，例如: ¥1.34 或 $0.18)
    // "rate_limit",// 限额配额与回满倒计时 (例如: 5h:28%(2h14m) 7d:42%(3d3h))
    // "cache",     // Prompt Cache 缓存命中率 (例如: Cache:92%)
    // "lines",     // 会话代码增删吞吐量统计 (例如: +185/-32)
    // "mcp",       // 已连接的 MCP 服务数量 (例如: MCP:2)
    // "effort",    // 思考级别/推理强度 (例如: [effort: high])
    // "output_style" // 输出风格标签 (例如: [concise])
  ],

  // 2. 终端显示行数
  // 1: 单行模式 (默认)
  // 2: 双行模式 (针对窄屏或多分屏终端，自动在项目分界处折行)
  // "auto": 自动模式 (根据终端可用列宽自动判断并折行)
  "lines": 1,

  // 3. Git 状态显示
  // false: 默认简短清爽的 * 标记 (例如: main*)
  // true:  显示与远端分支的上下游同步差异 (例如: main ↑2 ↓1*)
  "showGitAheadBehind": false,
  // gitCacheTtl: git 状态缓存秒数 (默认: 2)
  // 状态栏每次重绘都会执行本脚本，缓存可避免反复 fork git 子进程；0 表示每次实时读取
  "gitCacheTtl": 2,

  // 4. 上下文上限 Token 限制
  // 0: 自动跟随智能体实际配置大小 (官方 200k / 1M 等自适应，无需手动调整)
  // 大于 0: 强制指定上下文上限 Token 数 (例如: 64000)
  "contextWindowSize": 0,

  // 5. 费用与汇率计算 (启用 "cost" 字段时生效)
  // currency: 货币单位，可选 "USD" ($), "CNY" (¥), "BOTH" ($0.18 (¥1.34))
  "currency": "USD",
  // costMultiplier: 计费倍率 (中转站/代理商加价倍率，如 1.5 倍设为 1.5，官方原价填 1.0)
  "costMultiplier": 1.0,
  // exchangeRate: 美元兑人民币汇率 (默认: 7.25)
  "exchangeRate": 7.25,
  // showCostMultiplier: 是否在金额后显示倍率标签，如 (x1.5)
  "showCostMultiplier": false,

  // 6. 配额限额显示 (启用 "rate_limit" 字段时生效)
  // rateLimitWindows: 显示哪些周期的限额，可选 "5h"(5小时), "7d"(7天), "mo"(月度)，支持调整显示顺序
  "rateLimitWindows": [
    "5h",
    "7d",
    "mo"
  ],
  // showRateLimitCountdown: 是否显示额度回满倒计时，例如 (2h14m)
  "showRateLimitCountdown": true,
  // showRateLimitTrend: 是否显示消耗趋势 (↑ 偏快 / ↓ 偏慢)
  "showRateLimitTrend": false,

  // 7. 外观风格与分隔符:
  // delimiter: 分割符号 (默认: "|")，可输入任意自定义分割符号，例如 "|", "/", "•", "::", "-" 等
  "delimiter": "|",
  // icons: 图标风格，可选 "none" (纯文本), "unicode" (原生通用字符: ✦, ⚡, ⎇, ⏱，免装字体)
  "icons": "none",
  // progressBar: 是否在上下文旁显示进度条 [██░░░░░░]
  "progressBar": true,
  // progressBarLength: 进度条字符长度 (默认: 8)
  "progressBarLength": 8,
  // warningThreshold: 黄色警告阈值百分比 (默认: 80)
  "warningThreshold": 80,
  // dangerThreshold: 红色严重警告阈值百分比 (默认: 90)
  "dangerThreshold": 90,

  // 8. 终端颜色控制:
  // true: 默认彩色 (带告警变色: 绿/青/黄/红)
  // false: 彻底关闭颜色 (纯白/单色纯文本，一点颜色都不用)
  "colors": true,

  // 9. 色彩主题预设:
  // "default": 经典 ANSI 16 色 (默认兼容性最好)
  // "catppuccin": Mocha 柔和马卡龙调色板
  // "nord": 极光冷淡蓝灰调色板
  // "tokyo": Tokyo Night 赛博暗夜调色板
  "theme": "default",

  // 10. 模型名称自定义别名映射:
  // 默认会自动智能清理末尾长日期后缀 (如 claude-3-7-sonnet-20250219 -> claude-3-7-sonnet)
  // 您还可以配置映射字典自定义更简短的显示名称:
  "modelAliases": {
    // "claude-3-7-sonnet": "Sonnet 3.7",
    // "claude-3-5-haiku": "Haiku 3.5",
    // "claude-3-opus": "Opus 3"
  }
}
`;

/**
 * Strip comments and trailing commas from JSON string
 * @param {string} content
 * @returns {any}
 */
function parseJsonWithComments(content) {
  if (!content || typeof content !== "string" || !content.trim()) return {};
  const stripped = content.replace(
    /"(?:\\.|[^"\\])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (match, comment) => (comment ? "" : match)
  );
  const cleaned = stripped.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(cleaned);
}

/**
 * Load user config from ~/.claude/statusline.config.json or .jsonc if available.
 * If missing, automatically generates the annotated default config file.
 * @returns {StatuslineConfig}
 */
function loadConfig() {
  const claudeDir = path.join(os.homedir(), ".claude");
  const configPath = path.join(claudeDir, "statusline.config.json");
  const configJsoncPath = path.join(claudeDir, "statusline.config.jsonc");

  const targetPath = fs.existsSync(configJsoncPath) ? configJsoncPath : configPath;

  try {
    if (!fs.existsSync(targetPath)) {
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.writeFileSync(configPath, DEFAULT_CONFIG_TEMPLATE, "utf8");
      return { ...DEFAULT_CONFIG, ...parseJsonWithComments(DEFAULT_CONFIG_TEMPLATE) };
    }

    const raw = fs.readFileSync(targetPath, "utf8");
    const parsed = parseJsonWithComments(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Graceful fallback to default config
  }
  return { ...DEFAULT_CONFIG };
}

module.exports = {
  DEFAULT_FIELDS,
  DEFAULT_RATE_LIMIT_WINDOWS,
  GIT_TIMEOUT_MS,
  DEFAULT_CONFIG,
  UI_PRESETS,
  DEFAULT_CONFIG_TEMPLATE,
  parseJsonWithComments,
  loadConfig,
};
