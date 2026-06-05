#!/usr/bin/env node
// =============================================================================
// ΠΛΑΤΩΝ — Platon CLI
// Custom SDD interface using Claude Agent SDK. No banner.
// Single persistent session via async iterable prompt.
// =============================================================================

import { query } from "@anthropic-ai/claude-agent-sdk";
import { createInterface } from "readline";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SDD = resolve(__dirname, "..");

// ── Colores ─────────────────────────────────────────────────────────────────
const c = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  nc: "\x1b[0m",
};

// ── Splash ──────────────────────────────────────────────────────────────────
function getGitInfo() {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    const commits = execSync("git rev-list --count HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    return { branch, commits };
  } catch { return { branch: "?", commits: "0" }; }
}

function getProjects() {
  const skillsPath = resolve(SDD, "skills.yaml");
  if (!existsSync(skillsPath)) return [];
  const content = readFileSync(skillsPath, "utf-8");
  const projects = [];
  let inRegistries = false, currentProject = null;
  for (const line of content.split("\n")) {
    if (line.startsWith("registries:")) { inRegistries = true; continue; }
    if (/^[a-z]/.test(line) && inRegistries) { inRegistries = false; continue; }
    if (inRegistries) {
      const pm = line.match(/^  ([a-z][\w-]+):$/);
      if (pm) currentProject = pm[1];
      const tm = line.match(/test_ready:\s*(true|false)/);
      if (tm && currentProject) {
        projects.push({ name: currentProject, testReady: tm[1] === "true" });
        currentProject = null;
      }
    }
  }
  return projects;
}

function getSkillCount(project) {
  const regPath = resolve(SDD, "registries", `${project}.yaml`);
  if (!existsSync(regPath)) return "--";
  const content = readFileSync(regPath, "utf-8");
  const total = (content.match(/^  [a-z_]+:/gm) || []).length;
  const ready = (content.match(/ready: true/g) || []).length;
  return `${ready}/${total}`;
}

function getCalibration() {
  const configPath = resolve(SDD, "config.yaml");
  if (!existsSync(configPath)) return "sin config";
  const content = readFileSync(configPath, "utf-8");
  const match = content.match(/calibration:[\s\S]*?result:\s*(\w+)/);
  return match ? match[1] : "pendiente";
}

function showSplash() {
  const { branch, commits } = getGitInfo();
  const projects = getProjects();
  const calibration = getCalibration();
  const calColor = calibration === "pass" ? c.green : calibration === "fail" ? c.red : c.yellow;

  // ASCII art banner
  const banner = `${c.magenta}${c.bold}██████╗ ██╗      █████╗ ████████╗ ██████╗ ███╗   ██╗
██╔══██╗██║     ██╔══██╗╚══██╔══╝██╔═══██╗████╗  ██║
██████╔╝██║     ███████║   ██║   ██║   ██║██╔██╗ ██║
██╔═══╝ ██║     ██╔══██║   ██║   ██║   ██║██║╚██╗██║
██║     ███████╗██║  ██║   ██║   ╚██████╔╝██║ ╚████║
╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝${c.nc}`;

  // Test ready projects
  const readyProjects = projects.filter(p => p.testReady).map(p => p.name);
  const notReady = projects.filter(p => !p.testReady).map(p => p.name);

  console.clear();
  console.log();
  console.log(banner);
  console.log();
  console.log(`${c.dim}ΠΛΑΤΩΝ · Spec-Driven Development v1.0.0${c.nc}`);
  console.log();

  // Mode & Model
  console.log(`${c.bold}Mode:${c.nc}`);
  console.log(`  ${c.yellow}PLAN ONLY${c.nc}  ${c.dim}·${c.nc}  Platon piensa y planifica. No ejecuta.`);
  console.log();
  console.log(`${c.bold}Active Model:${c.nc}`);
  console.log(`  claude-opus-4.6  ${c.dim}·${c.nc}  effort: ${c.bold}max${c.nc}  ${c.dim}·${c.nc}  provider: anthropic`);
  console.log();

  // Available Tools (read-only for analysis)
  console.log(`${c.bold}Available Tools:${c.nc}  ${c.dim}(read-only — analysis only)${c.nc}`);
  console.log(`  ${c.cyan}read:${c.nc}           Read, Glob, Grep`);
  console.log(`  ${c.cyan}web:${c.nc}            WebFetch, WebSearch`);
  console.log();

  // Status
  console.log(`${c.bold}Status:${c.nc}`);
  console.log(`  ${c.cyan}workspace:${c.nc}   LIHER`);
  console.log(`  ${c.cyan}branch:${c.nc}      ${c.green}${branch}${c.nc} ${c.dim}(${commits} commits)${c.nc}`);
  console.log(`  ${c.cyan}sdd phase:${c.nc}   ${calColor}${calibration}${c.nc}`);
  console.log(`  ${c.cyan}projects:${c.nc}    ${projects.map(p => p.name).join(" · ")}`);
  if (readyProjects.length > 0) {
    console.log(`  ${c.cyan}test ready:${c.nc}  ${c.green}${readyProjects.join(", ")}${c.nc}`);
  }
  if (notReady.length > 0) {
    console.log(`  ${c.cyan}no tests:${c.nc}    ${c.dim}${notReady.join(", ")}${c.nc}`);
  }
  console.log();
  console.log(`  ${c.dim}hint:        describe tu objetivo y Platon creara el plan${c.nc}`);
  console.log();
}

// ── System prompt ───────────────────────────────────────────────────────────
function loadSystemPrompt() {
  const promptPath = resolve(SDD, "platon-prompt.md");
  if (existsSync(promptPath)) return readFileSync(promptPath, "utf-8");
  return "Eres ΠΛΑΤΩΝ — framework SDD. Sigue: Preflight → Calibracion → Strict TDD.";
}

// ── Config (Platon: solo planifica, nunca actua) ────────────────────────────
const MODEL = "claude-opus-4-6";
const EFFORT = "max";

// ── Slash commands ──────────────────────────────────────────────────────────
function showHelp() {
  console.log(`\n  ${c.bold}Commands:${c.nc}`);
  console.log(`  ${c.cyan}/clear${c.nc}     Clear screen and show splash`);
  console.log(`  ${c.cyan}/help${c.nc}      Show this help`);
  console.log(`  ${c.cyan}/exit${c.nc}      End session\n`);
}

// ── Interactive session ─────────────────────────────────────────────────────
async function main() {
  showSplash();

  const systemPrompt = loadSystemPrompt();
  let done = false;
  let userResolve = null;
  let sessionAbort = null;

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("close", () => {
    done = true;
    if (userResolve) userResolve(null);
  });

  const askUser = () => new Promise((resolve) => {
    if (done) { resolve(null); return; }
    rl.question(`  ${c.magenta}❯${c.nc} `, (answer) => resolve(answer));
  });

  // ── Session lifecycle ───────────────────────────────────────────────────
  function startSession() {
    userResolve = null;

    async function* userMessages() {
      while (!done) {
        const input = await new Promise((res) => { userResolve = res; });
        if (input === null) return;
        yield { type: "user", message: { role: "user", content: input } };
      }
    }

    const abortController = new AbortController();
    sessionAbort = abortController;

    const session = query({
      prompt: userMessages(),
      options: {
        allowedTools: ["Read", "Glob", "Grep", "WebFetch", "WebSearch"],
        permissionMode: "default",
        cwd: ROOT,
        systemPrompt,
        model: MODEL,
        effort: EFFORT,
        abortController,
      },
    });

    // Process messages in background
    (async () => {
      try {
        for await (const message of session) {
          if (message.type === "assistant" && message.message?.content) {
            for (const block of message.message.content) {
              if ("text" in block && block.text) {
                const lines = block.text.split("\n");
                for (const line of lines) {
                  process.stdout.write(`  ${line}\n`);
                }
              } else if ("name" in block) {
                console.log(`\n  ${c.dim}⚙ ${block.name}${c.nc}`);
              }
            }
          }
          if (message.type === "result") {
            if (message.subtype === "error" || message.is_error) {
              console.log(`\n  ${c.red}Error: ${message.result || message.errors?.join(", ") || "unknown"}${c.nc}`);
            }
            console.log();
            promptNextInput();
          }
        }
      } catch (err) {
        if (!done && !err.message?.includes("aborted")) {
          console.log(`\n  ${c.red}Sesion terminada: ${err.message}${c.nc}\n`);
        }
      } finally {
        if (!done) promptNextInput();
      }
    })();
  }

  // ── Input handling ──────────────────────────────────────────────────────
  function handleSlashCommand(input) {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1]?.toLowerCase();

    switch (cmd) {
      case "/exit":
      case "/quit":
        console.log(`\n  ${c.dim}Sesion finalizada.${c.nc}\n`);
        done = true;
        if (userResolve) userResolve(null);
        rl.close();
        return true;

      case "/help":
        showHelp();
        promptNextInput();
        return true;

      case "/clear":
        showSplash();
        promptNextInput();
        return true;

      default:
        return false; // Not a known command, send to agent
    }
  }

  function promptNextInput() {
    if (done) return;
    askUser().then((input) => {
      if (input === null || done) {
        done = true;
        if (userResolve) userResolve(null);
        return;
      }
      if (!input.trim()) { promptNextInput(); return; }

      // Check for slash commands
      if (input.trim().startsWith("/")) {
        if (handleSlashCommand(input)) return;
      }

      console.log();
      userResolve(input);
    }).catch(() => {
      done = true;
      if (userResolve) userResolve(null);
    });
  }

  // ── Start ───────────────────────────────────────────────────────────────
  startSession();
  promptNextInput();

  // Keep process alive until done
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (done) { clearInterval(check); resolve(); }
    }, 100);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal: ${err.message}${c.nc}\n`);
  process.exit(1);
});
