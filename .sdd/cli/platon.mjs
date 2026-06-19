#!/usr/bin/env node
// =============================================================================
// ΠΛΑΤΩΝ — Platon CLI v2.0
// Custom SDD interface using Claude Agent SDK. No banner.
// v2.0: Persistent memory (Engram-inspired) + Skills injection + Delegation
// =============================================================================

import { query } from "@anthropic-ai/claude-agent-sdk";
import { createInterface } from "readline";
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync,
} from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT    = resolve(__dirname, "../..");
const SDD     = resolve(__dirname, "..");
const MEM_DIR = resolve(SDD, "memory");
const SES_DIR = resolve(MEM_DIR, "sessions");
const ENT_DIR = resolve(MEM_DIR, "entities");
const SKL_DIR = resolve(SDD, "skills");

// ── Colores ─────────────────────────────────────────────────────────────────
const c = {
  bold: "\x1b[1m", dim: "\x1b[2m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", magenta: "\x1b[35m", red: "\x1b[31m", blue: "\x1b[34m",
  nc: "\x1b[0m",
};

// ── Memory ───────────────────────────────────────────────────────────────────

function ensureMemoryDirs() {
  for (const dir of [MEM_DIR, SES_DIR, ENT_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function listSessions() {
  if (!existsSync(SES_DIR)) return [];
  return readdirSync(SES_DIR).filter(f => f.endsWith(".md")).sort();
}

function listEntities() {
  if (!existsSync(ENT_DIR)) return [];
  return readdirSync(ENT_DIR).filter(f => f.endsWith(".md")).sort();
}

function loadMemory() {
  ensureMemoryDirs();
  const sections = [];

  // Últimas 3 sesiones
  const sessions = listSessions().slice(-3);
  if (sessions.length > 0) {
    sections.push("## Sesiones recientes\n");
    for (const f of sessions) {
      const raw = readFileSync(resolve(SES_DIR, f), "utf-8");
      const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();
      sections.push(`### ${f.replace(".md", "")}\n${body}`);
    }
  }

  // Todas las entidades
  const entities = listEntities();
  if (entities.length > 0) {
    sections.push("\n## Memorias guardadas\n");
    for (const f of entities) {
      const raw = readFileSync(resolve(ENT_DIR, f), "utf-8");
      const titleMatch = raw.match(/^title:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1] : f.replace(".md", "");
      const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();
      sections.push(`### ${title}\n${body}`);
    }
  }

  if (sections.length === 0) return null;
  return `\n\n---\n# CONTEXTO DE SESIONES ANTERIORES\n\n${sections.join("\n\n")}`;
}

function loadSkills() {
  if (!existsSync(SKL_DIR)) return null;
  const files = readdirSync(SKL_DIR).filter(f => f.endsWith(".md")).sort();
  if (files.length === 0) return null;
  const blocks = files.map(f => readFileSync(resolve(SKL_DIR, f), "utf-8").replace(/^---[\s\S]*?---\n/, "").trim());
  return `\n\n---\n# SKILLS DEL STACK (patrones por tecnología)\n\n${blocks.join("\n\n---\n\n")}`;
}

function saveSession(summary) {
  ensureMemoryDirs();
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const name = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.md`;
  const content = `---\ndate: ${now.toISOString().slice(0, 10)}\n---\n\n${summary}\n`;
  writeFileSync(resolve(SES_DIR, name), content, "utf-8");
  return name;
}

function saveEntity(title, content) {
  ensureMemoryDirs();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const name = `${slug}.md`;
  const full = `---\ntitle: ${title}\nupdated: ${new Date().toISOString().slice(0, 10)}\n---\n\n${content}\n`;
  writeFileSync(resolve(ENT_DIR, name), full, "utf-8");
  return name;
}

// Decisiones arquitectonicas — entidad de memoria con formato estandar
// (contexto / decision / razon / alternativas descartadas), para que se
// inyecten en futuras sesiones y Platon no re-evalue lo ya decidido.
function saveDecision(title, { context, decision, reason, alternatives }) {
  ensureMemoryDirs();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const name = `decision-${slug}.md`;
  const date = new Date().toISOString().slice(0, 10);
  const body = [
    `## Contexto`,
    context || "(sin registrar)",
    "",
    `## Decision`,
    decision || "(sin registrar)",
    "",
    `## Razon`,
    reason || "(sin registrar)",
    "",
    `## Alternativas descartadas`,
    alternatives || "(ninguna registrada)",
  ].join("\n");
  const full = `---\ntitle: ${title}\ntype: decision\ndate: ${date}\nupdated: ${date}\n---\n\n${body}\n`;
  writeFileSync(resolve(ENT_DIR, name), full, "utf-8");
  return name;
}

function searchMemory(query) {
  const results = [];
  for (const dir of [SES_DIR, ENT_DIR]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith(".md"))) {
      const raw = readFileSync(resolve(dir, f), "utf-8");
      if (raw.toLowerCase().includes(query.toLowerCase())) {
        const idx = raw.toLowerCase().indexOf(query.toLowerCase());
        const start = Math.max(0, idx - 80);
        const end = Math.min(raw.length, idx + 200);
        const excerpt = raw.slice(start, end).replace(/\n/g, " ").trim();
        results.push({ file: f, excerpt });
      }
    }
  }
  return results;
}

// ── Splash ───────────────────────────────────────────────────────────────────
function getGitInfo() {
  try {
    const branch  = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    const commits = execSync("git rev-list --count HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    return { branch, commits };
  } catch { return { branch: "?", commits: "0" }; }
}

function getProjects() {
  const skillsPath = resolve(SDD, "skills.yaml");
  if (!existsSync(skillsPath)) return [];
  const content = readFileSync(skillsPath, "utf-8");
  const projects = [];
  let inReg = false, cur = null;
  for (const line of content.split("\n")) {
    if (line.startsWith("registries:"))  { inReg = true; continue; }
    if (/^[a-z]/.test(line) && inReg)    { inReg = false; continue; }
    if (!inReg) continue;
    const pm = line.match(/^  ([a-z][\w-]+):$/);
    if (pm) { cur = pm[1]; continue; }
    const tm = line.match(/test_ready:\s*(true|false)/);
    if (tm && cur) { projects.push({ name: cur, testReady: tm[1] === "true" }); cur = null; }
  }
  return projects;
}

function getCalibration() {
  const p = resolve(SDD, "config.yaml");
  if (!existsSync(p)) return "sin config";
  const m = readFileSync(p, "utf-8").match(/calibration:[\s\S]*?result:\s*(\w+)/);
  return m ? m[1] : "pendiente";
}

function getMemoryStats() {
  const sessions = listSessions().length;
  const entities = listEntities().length;
  const skills   = existsSync(SKL_DIR) ? readdirSync(SKL_DIR).filter(f => f.endsWith(".md")).length : 0;
  return { sessions, entities, skills };
}

function showSplash() {
  const { branch, commits } = getGitInfo();
  const projects    = getProjects();
  const calibration = getCalibration();
  const calColor    = calibration === "pass" ? c.green : calibration === "fail" ? c.red : c.yellow;
  const mem         = getMemoryStats();

  const banner = `${c.magenta}${c.bold}██████╗ ██╗      █████╗ ████████╗ ██████╗ ███╗   ██╗
██╔══██╗██║     ██╔══██╗╚══██╔══╝██╔═══██╗████╗  ██║
██████╔╝██║     ███████║   ██║   ██║   ██║██╔██╗ ██║
██╔═══╝ ██║     ██╔══██║   ██║   ██║   ██║██║╚██╗██║
██║     ███████╗██║  ██║   ██║   ╚██████╔╝██║ ╚████║
╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝${c.nc}`;

  const ready  = projects.filter(p => p.testReady).map(p => p.name);
  const noTest = projects.filter(p => !p.testReady).map(p => p.name);

  console.clear();
  console.log();
  console.log(banner);
  console.log();
  console.log(`${c.dim}ΠΛΑΤΩΝ · Spec-Driven Development v2.0${c.nc}`);
  console.log();

  console.log(`${c.bold}Mode:${c.nc}`);
  console.log(`  ${c.yellow}PLAN ONLY${c.nc}  ${c.dim}·${c.nc}  Platón planifica. Claude Code ejecuta.`);
  console.log();
  console.log(`${c.bold}Models:${c.nc}`);
  console.log(`  ${c.magenta}planner:${c.nc}    claude-opus-4-6   ${c.dim}·${c.nc}  effort: max`);
  console.log(`  ${c.cyan}executor:${c.nc}   claude-sonnet-4-6 ${c.dim}·${c.nc}  Claude Code (normal)`);
  console.log();

  console.log(`${c.bold}Status:${c.nc}`);
  console.log(`  ${c.cyan}workspace:${c.nc}   LIHER`);
  console.log(`  ${c.cyan}branch:${c.nc}      ${c.green}${branch}${c.nc} ${c.dim}(${commits} commits)${c.nc}`);
  console.log(`  ${c.cyan}sdd phase:${c.nc}   ${calColor}${calibration}${c.nc}`);
  console.log(`  ${c.cyan}projects:${c.nc}    ${projects.map(p => p.name).join(" · ") || "—"}`);
  if (ready.length > 0)  console.log(`  ${c.cyan}test ready:${c.nc}  ${c.green}${ready.join(", ")}${c.nc}`);
  if (noTest.length > 0) console.log(`  ${c.cyan}no tests:${c.nc}    ${c.dim}${noTest.join(", ")}${c.nc}`);
  console.log();

  console.log(`${c.bold}Memory:${c.nc}`);
  console.log(`  ${c.cyan}sessions:${c.nc}    ${mem.sessions > 0 ? c.green + mem.sessions + c.nc : c.dim + "0" + c.nc}  ${c.dim}·${c.nc}  ${c.cyan}entities:${c.nc} ${mem.entities > 0 ? c.green + mem.entities + c.nc : c.dim + "0" + c.nc}  ${c.dim}·${c.nc}  ${c.cyan}skills:${c.nc} ${mem.skills > 0 ? c.green + mem.skills + c.nc : c.yellow + "0" + c.nc}`);
  console.log();
  console.log(`  ${c.dim}hint: describe tu objetivo · /help para comandos${c.nc}`);
  console.log();
}

// ── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  const base   = existsSync(resolve(SDD, "platon-prompt.md"))
    ? readFileSync(resolve(SDD, "platon-prompt.md"), "utf-8")
    : "Eres ΠΛΑΤΩΝ — framework SDD. Sigue: Preflight → Calibracion → Strict TDD.";

  const memory = loadMemory();
  const skills = loadSkills();

  return base + (memory || "") + (skills || "");
}

// ── Delegation ───────────────────────────────────────────────────────────────
function formatDelegatePrompt(plan) {
  const configPath = resolve(SDD, "config.yaml");
  const stackHint  = existsSync(configPath)
    ? "Stack: Astro 6, Nuxt 4, Next.js 16, Laravel 13. Docker WSL2. SDD protocol."
    : "";

  return [
    "# Plan SDD — ejecutar con Claude Code",
    "",
    `> Workspace: LIHER (D:/Compartida/LIHER)`,
    `> ${stackHint}`,
    `> Sigue el plan exactamente. No planifiques — implementa.`,
    "",
    plan,
    "",
    "---",
    "Cuando termines cada paso, ejecuta los tests del proyecto antes de continuar.",
  ].join("\n");
}

// ── Help ─────────────────────────────────────────────────────────────────────
function showHelp() {
  console.log(`\n  ${c.bold}Comandos:${c.nc}`);
  console.log(`  ${c.cyan}/clear${c.nc}              Limpiar pantalla`);
  console.log(`  ${c.cyan}/end${c.nc}                Guardar sesion y salir`);
  console.log(`  ${c.cyan}/mem list${c.nc}           Listar sesiones y entidades guardadas`);
  console.log(`  ${c.cyan}/mem save <título>${c.nc}  Guardar última respuesta como entidad`);
  console.log(`  ${c.cyan}/mem search <q>${c.nc}     Buscar en memoria`);
  console.log(`  ${c.cyan}/decide [título]${c.nc}    Guardar decision arquitectonica estructurada (contexto/decision/razon/alternativas)`);
  console.log(`  ${c.cyan}/delegate${c.nc}           Formatear último plan para Claude Code`);
  console.log(`  ${c.cyan}/help${c.nc}               Mostrar esta ayuda`);
  console.log(`  ${c.cyan}/exit${c.nc}               Salir sin guardar\n`);
}

function showMemoryList() {
  const sessions = listSessions();
  const entities = listEntities();

  console.log(`\n  ${c.bold}Memoria${c.nc}`);
  if (sessions.length === 0) {
    console.log(`  ${c.dim}sessions: (vacío)${c.nc}`);
  } else {
    console.log(`  ${c.cyan}sessions (${sessions.length}):${c.nc}`);
    for (const f of sessions.slice(-5)) console.log(`    ${c.dim}·${c.nc} ${f.replace(".md", "")}`);
  }
  if (entities.length === 0) {
    console.log(`  ${c.dim}entities: (vacío)${c.nc}`);
  } else {
    console.log(`  ${c.cyan}entities (${entities.length}):${c.nc}`);
    for (const f of entities) {
      const raw   = readFileSync(resolve(ENT_DIR, f), "utf-8");
      const title = (raw.match(/^title:\s*(.+)$/m) || [])[1] || f.replace(".md", "");
      console.log(`    ${c.dim}·${c.nc} ${title}`);
    }
  }
  console.log();
}

// ── Config ───────────────────────────────────────────────────────────────────
const MODEL  = "claude-opus-4-6";
const EFFORT = "max";

// ── Interactive session ──────────────────────────────────────────────────────
async function main() {
  showSplash();

  const systemPrompt   = buildSystemPrompt();
  let done             = false;
  let userResolve      = null;
  let lastAgentResponse = "";

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("close", () => { done = true; if (userResolve) userResolve(null); });

  const askUser = () => new Promise((res) => {
    if (done) { res(null); return; }
    rl.question(`  ${c.magenta}❯${c.nc} `, (a) => res(a));
  });

  // ── Session lifecycle ─────────────────────────────────────────────────────
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

    (async () => {
      try {
        let currentResponseText = "";
        for await (const message of session) {
          if (message.type === "assistant" && message.message?.content) {
            for (const block of message.message.content) {
              if ("text" in block && block.text) {
                currentResponseText += block.text;
                for (const line of block.text.split("\n")) {
                  process.stdout.write(`  ${line}\n`);
                }
              } else if ("name" in block) {
                console.log(`\n  ${c.dim}⚙ ${block.name}${c.nc}`);
              }
            }
          }
          if (message.type === "result") {
            if (currentResponseText) {
              lastAgentResponse = currentResponseText.trim();
              currentResponseText = "";
            }
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

  // ── Slash commands ────────────────────────────────────────────────────────
  function handleSlashCommand(input) {
    const parts = input.trim().split(/\s+/);
    const cmd   = parts[0].toLowerCase();

    switch (cmd) {
      case "/exit":
      case "/quit":
        console.log(`\n  ${c.dim}Sesion finalizada sin guardar.${c.nc}\n`);
        done = true;
        if (userResolve) userResolve(null);
        rl.close();
        return true;

      case "/end":
        rl.question(`\n  ${c.cyan}Resumen de esta sesion${c.nc} ${c.dim}(Enter para omitir):${c.nc} `, (summary) => {
          if (summary.trim()) {
            const file = saveSession(summary.trim());
            console.log(`\n  ${c.green}✓ Sesion guardada: ${file}${c.nc}`);
          }
          console.log(`\n  ${c.dim}Hasta la proxima.${c.nc}\n`);
          done = true;
          rl.close();
        });
        return true;

      case "/mem": {
        const sub  = (parts[1] || "list").toLowerCase();
        const rest = parts.slice(2).join(" ");

        if (sub === "list") {
          showMemoryList();
          promptNextInput();
          return true;
        }
        if (sub === "save") {
          const title = rest || `Nota ${new Date().toLocaleDateString("es-ES")}`;
          if (!lastAgentResponse) {
            console.log(`\n  ${c.yellow}No hay respuesta reciente que guardar.${c.nc}\n`);
          } else {
            const file = saveEntity(title, lastAgentResponse);
            console.log(`\n  ${c.green}✓ Guardado: ${file}${c.nc}\n`);
          }
          promptNextInput();
          return true;
        }
        if (sub === "search") {
          if (!rest) {
            console.log(`\n  ${c.yellow}Uso: /mem search <consulta>${c.nc}\n`);
            promptNextInput();
            return true;
          }
          const results = searchMemory(rest);
          if (results.length === 0) {
            console.log(`\n  ${c.dim}Sin resultados para "${rest}"${c.nc}\n`);
          } else {
            console.log(`\n  ${c.cyan}${results.length} resultado(s) para "${rest}":${c.nc}`);
            for (const r of results) {
              console.log(`\n  ${c.bold}${r.file}${c.nc}`);
              console.log(`  ${c.dim}...${r.excerpt}...${c.nc}`);
            }
            console.log();
          }
          promptNextInput();
          return true;
        }
        showHelp();
        promptNextInput();
        return true;
      }

      case "/decide": {
        const presetTitle = parts.slice(1).join(" ").trim();

        const askTitle = (cb) => {
          if (presetTitle) { cb(presetTitle); return; }
          rl.question(`\n  ${c.cyan}Titulo de la decision${c.nc} ${c.dim}(Enter para cancelar):${c.nc} `, (t) => cb(t.trim()));
        };

        askTitle((title) => {
          if (!title) {
            console.log(`\n  ${c.dim}Cancelado.${c.nc}\n`);
            promptNextInput();
            return;
          }
          rl.question(`  ${c.cyan}Contexto${c.nc} ${c.dim}(que se evaluo):${c.nc} `, (context) => {
            rl.question(`  ${c.cyan}Decision${c.nc} ${c.dim}(que se eligio):${c.nc} `, (decision) => {
              rl.question(`  ${c.cyan}Razon${c.nc} ${c.dim}(por que):${c.nc} `, (reason) => {
                rl.question(`  ${c.cyan}Alternativas descartadas${c.nc} ${c.dim}(opcional, Enter para omitir):${c.nc} `, (alternatives) => {
                  const file = saveDecision(title, {
                    context: context.trim(),
                    decision: decision.trim(),
                    reason: reason.trim(),
                    alternatives: alternatives.trim(),
                  });
                  console.log(`\n  ${c.green}✓ Decision guardada: ${file}${c.nc}`);
                  console.log(`  ${c.dim}Se inyectara automaticamente en futuras sesiones (memoria de entidades).${c.nc}\n`);
                  promptNextInput();
                });
              });
            });
          });
        });
        return true;
      }

      case "/delegate":
        if (!lastAgentResponse) {
          console.log(`\n  ${c.yellow}No hay plan reciente para delegar.${c.nc}\n`);
        } else {
          const prompt = formatDelegatePrompt(lastAgentResponse);
          console.log(`\n  ${c.bold}Plan para Claude Code${c.nc} ${c.dim}(copia y pega):${c.nc}\n`);
          console.log(`  ${c.dim}${"─".repeat(60)}${c.nc}`);
          for (const line of prompt.split("\n")) console.log(`  ${line}`);
          console.log(`  ${c.dim}${"─".repeat(60)}${c.nc}\n`);
        }
        promptNextInput();
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
        return false;
    }
  }

  function promptNextInput() {
    if (done) return;
    askUser().then((input) => {
      if (input === null || done) { done = true; if (userResolve) userResolve(null); return; }
      if (!input.trim()) { promptNextInput(); return; }
      if (input.trim().startsWith("/")) {
        if (handleSlashCommand(input)) return;
      }
      console.log();
      userResolve(input);
    }).catch(() => { done = true; if (userResolve) userResolve(null); });
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  startSession();
  promptNextInput();

  await new Promise((resolve) => {
    const check = setInterval(() => { if (done) { clearInterval(check); resolve(); } }, 100);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal: ${err.message}${c.nc}\n`);
  process.exit(1);
});
