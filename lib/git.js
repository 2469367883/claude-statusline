// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { GIT_TIMEOUT_MS } = require("./config.js");

/**
 * Read `git status --porcelain --branch` output, reusing a short-lived on-disk cache.
 *
 * The statusline runs as a fresh process on every redraw, so an in-memory cache
 * would never survive between renders; the cache lives in the OS temp directory.
 *
 * @param {string} cwd
 * @param {number} [ttlSeconds] Seconds to reuse a previous result. 0 disables caching.
 * @returns {string | null} Raw porcelain output, or null when git is unavailable.
 */
function readGitStatus(cwd, ttlSeconds) {
  const ttlMs = Math.max(0, Number(ttlSeconds) || 0) * 1000;
  const cacheFile = path.join(
    os.tmpdir(),
    `claude-code-status-git-${crypto.createHash("sha1").update(cwd).digest("hex").slice(0, 16)}.json`
  );

  if (ttlMs > 0) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (typeof cached.output === "string" && Date.now() - cached.at < ttlMs) {
        return cached.output;
      }
    } catch {
      // Missing or unreadable cache: fall through to a fresh git call
    }
  }

  try {
    const output = execFileSync(
      "git",
      ["--no-optional-locks", "-C", cwd, "status", "--porcelain", "--branch"],
      {
        timeout: GIT_TIMEOUT_MS,
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }
    );

    if (ttlMs > 0) {
      try {
        fs.writeFileSync(cacheFile, JSON.stringify({ at: Date.now(), output }), "utf8");
      } catch {
        // The cache is best-effort: rendering must not fail because of it
      }
    }
    return output;
  } catch (err) {
    // A timeout means git is genuinely too slow here, which would silently drop
    // the branch — surface it. Anything else (not a repo, git not installed) is
    // an expected condition and stays quiet.
    if (/** @type {any} */ (err) && /** @type {any} */ (err).code === "ETIMEDOUT") {
      process.stderr.write(
        `claude-code-status: git status timed out after ${GIT_TIMEOUT_MS}ms (${cwd})\n`
      );
    }
    return null;
  }
}

module.exports = {
  readGitStatus,
};
