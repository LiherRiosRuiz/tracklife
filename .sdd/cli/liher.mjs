#!/usr/bin/env node
// =============================================================================
// LIHER — Gobernador del Workspace v2.0
// Multi-agent orchestrator using Claude Agent SDK.
// Coordina: Platon (pensador) + Quevedo (cronista) + Vinci (ejecutor)
// =============================================================================

import { query } from "@anthropic-ai/claude-agent-sdk";
import { createInterface } from "readline";
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync,
  appendFileSync,
} from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dirname, "../..");
const SDD      = resolve(__dirname, "..");
const MEM_DIR  = resolve(SDD, "memory");
const SES_DIR  = resolve(MEM_DIR, "sessions");
const ENT_DIR  = resolve(MEM_DIR, "entities");
const SKL_DIR  = resolve(SDD, "skills");
const DOCS_DIR = resolve(ROOT, "docs");
const CHR_DIR  = resolve(SDD, "chronicle");
const DAILY_DIR = resolve(CHR_DIR, "daily");

// ── Colores ─────────────────────────────────────────────────────────────────
const c = {
  bold: "\x1b[1m", dim: "\x1b[2m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", magenta: "\x1b[35m", red: "\x1b[31m", blue: "\x1b[34m",
  white: "\x1b[37m", nc: "\x1b[0m",
};

// ── Activity log ─────────────────────────────────────────────────────────────
const ACTIVITY_LOG = resolve(SDD, "activity.log");

function logActivity(line) {
  try {
    appendFileSync(ACTIVITY_LOG, line + "\n");
  } catch { /* no bloquear si falla el log */ }
}

// ── Funciones puras (exportables para testing) ───────────────────────────────

function subagentMeta(type) {
  const map = {
    platon:  { name: "ΠΛΑΤΏΝ",  color: c.magenta, icon: "Π" },
    quevedo: { name: "QUEVEDO", color: c.blue,    icon: "Q" },
    vinci:   { name: "VINCI",   color: c.green,   icon: "V" },
  };
  return map[type?.toLowerCase()] || { name: (type || "AGENT").toUpperCase(), color: c.dim, icon: "?" };
}

function formatToolCall(name, input) {
  input = input || {};
  switch (name) {
    case "Read":
    case "Write":
    case "Edit": {
      const p = input.file_path || input.path || "";
      return `${name} ${p.split("/").pop() || p}`;
    }
    case "Bash": {
      const cmd = (input.command || "").replace(/\n/g, " ").trim();
      return `Bash: ${cmd.length > 60 ? cmd.slice(0, 60) + "…" : cmd}`;
    }
    case "Grep": return `Grep: ${input.pattern || ""}`;
    case "Glob": return `Glob: ${input.pattern || ""}`;
    case "WebFetch": return `WebFetch: ${(input.url || "").slice(0, 50)}`;
    case "WebSearch": return `WebSearch: ${input.query || ""}`;
    default: return name;
  }
}

function formatActivityLine(evt) {
  const ts = new Date().toISOString().slice(11, 19);
  const meta = subagentMeta(evt.subagent_type);
  const dur = evt.usage?.duration_ms ? `${Math.round(evt.usage.duration_ms / 1000)}s` : "";
  const tokens = evt.usage?.total_tokens ? `${evt.usage.total_tokens}t` : "";

  switch (evt.subtype) {
    case "task_started":
      return `${ts} :: ${meta.name} iniciado`;
    case "task_progress":
      if (evt.summary) return `${ts} :: ${meta.name}: "${evt.summary.slice(0, 50)}"`;
      if (evt.last_tool_name) return `${ts} :: ${meta.name} > ${formatToolCall(evt.last_tool_name, {})}`;
      return `${ts} :: ${meta.name} trabajando... ${dur}`;
    case "task_notification": {
      const icon = evt.status === "completed" ? "✓" : evt.status === "failed" ? "✗" : "○";
      return `${ts} ${icon} ${meta.name} ${evt.status} (${dur}${tokens ? ", " + tokens : ""})`;
    }
    default:
      return `${ts} ${evt.subtype || "evento"}`;
  }
}

// ── Context Loaders (from platon.mjs) ───────────────────────────────────────

function loadMemory() {
  const sections = [];

  // Last 3 sessions
  if (existsSync(SES_DIR)) {
    const sessions = readdirSync(SES_DIR).filter(f => f.endsWith(".md")).sort().slice(-3);
    if (sessions.length > 0) {
      sections.push("## Sesiones recientes\n");
      for (const f of sessions) {
        const raw = readFileSync(resolve(SES_DIR, f), "utf-8");
        const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();
        sections.push(`### ${f.replace(".md", "")}\n${body}`);
      }
    }
  }

  // All entities
  if (existsSync(ENT_DIR)) {
    const entities = readdirSync(ENT_DIR).filter(f => f.endsWith(".md")).sort();
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

// ── Context Loaders (from quevedo.mjs) ──────────────────────────────────────

function loadRecentChronicle(days = 3) {
  if (!existsSync(DAILY_DIR)) return null;
  const files = readdirSync(DAILY_DIR).filter(f => f.endsWith(".md")).sort().slice(-days);
  if (files.length === 0) return null;
  const sections = files.map(f => readFileSync(resolve(DAILY_DIR, f), "utf-8").trim());
  return `\n\n---\n# CRONICA RECIENTE\n\n${sections.join("\n\n")}`;
}

function buildVaultState() {
  if (!existsSync(DOCS_DIR)) return "";
  const files = readdirSync(DOCS_DIR).filter(f => f.endsWith(".md"));
  const graph = new Map();

  for (const f of files) {
    const name = f.replace(".md", "");
    graph.set(name, { outbound: [], inbound: [], exists: true });
  }

  for (const f of files) {
    const name = f.replace(".md", "");
    const content = readFileSync(resolve(DOCS_DIR, f), "utf-8");
    const links = [...content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(m => m[1]);
    const unique = [...new Set(links)];
    for (const target of unique) {
      graph.get(name).outbound.push(target);
      if (!graph.has(target)) {
        graph.set(target, { outbound: [], inbound: [], exists: false });
      }
      graph.get(target).inbound.push(name);
    }
  }

  // Build summary
  const noteCount = [...graph.values()].filter(d => d.exists).length;
  const linkCount = [...graph.values()].reduce((s, d) => s + d.outbound.length, 0);
  const orphans = [...graph.entries()]
    .filter(([name, d]) => d.exists && d.inbound.length === 0 && name !== "Home")
    .map(([n]) => n);
  const broken = [];
  for (const [name, data] of graph) {
    if (!data.exists) {
      for (const source of data.inbound) broken.push({ source, target: name });
    }
  }

  let ctx = `\n\n---\n# ESTADO DEL VAULT\n\n`;
  ctx += `Notas: ${noteCount} · Enlaces: ${linkCount}\n`;
  if (orphans.length > 0) ctx += `Huerfanas: ${orphans.join(", ")}\n`;
  if (broken.length > 0) ctx += `Enlaces rotos: ${broken.map(b => `${b.source} -> [[${b.target}]]`).join(", ")}\n`;
  return ctx;
}

// ── Subagent Prompt Builders ────────────────────────────────────────────────

function buildPlatonSubPrompt() {
  const promptPath = resolve(SDD, "platon-prompt.md");
  const base = existsSync(promptPath)
    ? readFileSync(promptPath, "utf-8")
    : "Eres ΠΛΑΤΏΝ — framework SDD. Sigue: Preflight → Calibracion → Strict TDD.";

  const memory = loadMemory();
  const skills = loadSkills();

  const override = `

---
## MODO SUBAGENTE

Operas como subagente de LIHER. Diferencias con modo standalone:
- NO menciones /delegate — LIHER orquesta automaticamente
- Devuelve tu plan completo como respuesta directa
- LIHER pasara tu plan a Vinci para ejecucion
- No necesitas formatear el plan para "pegar en Claude Code"
- Produce el plan en el mismo formato estructurado de siempre
`;

  return base + (memory || "") + (skills || "") + override;
}

function buildQuevedoSubPrompt() {
  const promptPath = resolve(SDD, "quevedo-prompt.md");
  const base = existsSync(promptPath)
    ? readFileSync(promptPath, "utf-8")
    : "Eres QUEVEDO — cronista del workspace LIHER. Documenta, cronifica, y mantiene el vault.";

  const chronicle = loadRecentChronicle();
  const vaultState = buildVaultState();

  return base + (chronicle || "") + vaultState;
}

function buildVinciSubPrompt() {
  const promptPath = resolve(SDD, "vinci-prompt.md");
  return existsSync(promptPath)
    ? readFileSync(promptPath, "utf-8")
    : "Eres VINCI — ejecutor del workspace LIHER. Implementa planes al pie de la letra.";
}

// ── LIHER System Prompt ─────────────────────────────────────────────────────

function buildLiherSystemPrompt() {
  const promptPath = resolve(SDD, "liher-prompt.md");
  const base = existsSync(promptPath)
    ? readFileSync(promptPath, "utf-8")
    : "Eres LIHER — gobernador del workspace. Analiza, coordina agentes, presenta resultados.";

  // Workspace status summary
  let status = "\n\n---\n# ESTADO DEL WORKSPACE\n\n";
  try {
    const branch  = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    const commits = execSync("git rev-list --count HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    status += `Git: ${branch} (${commits} commits)\n`;
  } catch { status += "Git: no disponible\n"; }

  // Memory stats
  const sessions = existsSync(SES_DIR) ? readdirSync(SES_DIR).filter(f => f.endsWith(".md")).length : 0;
  const entities = existsSync(ENT_DIR) ? readdirSync(ENT_DIR).filter(f => f.endsWith(".md")).length : 0;
  const skills   = existsSync(SKL_DIR) ? readdirSync(SKL_DIR).filter(f => f.endsWith(".md")).length : 0;
  status += `Memoria: ${sessions} sesiones, ${entities} entidades, ${skills} skills\n`;

  // Chronicle stats
  const dailyCount = existsSync(DAILY_DIR) ? readdirSync(DAILY_DIR).filter(f => f.endsWith(".md")).length : 0;
  status += `Cronica: ${dailyCount} dias registrados\n`;

  // Vault stats
  const noteCount = existsSync(DOCS_DIR) ? readdirSync(DOCS_DIR).filter(f => f.endsWith(".md")).length : 0;
  status += `Vault: ${noteCount} notas\n`;

  return base + status;
}

// ── Splash ──────────────────────────────────────────────────────────────────

function getGitInfo() {
  try {
    const branch  = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    const commits = execSync("git rev-list --count HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
    return { branch, commits };
  } catch { return { branch: "?", commits: "0" }; }
}

function showSplash() {
  const { branch, commits } = getGitInfo();

  // Memory stats
  const sessions = existsSync(SES_DIR) ? readdirSync(SES_DIR).filter(f => f.endsWith(".md")).length : 0;
  const entities = existsSync(ENT_DIR) ? readdirSync(ENT_DIR).filter(f => f.endsWith(".md")).length : 0;
  const skills   = existsSync(SKL_DIR) ? readdirSync(SKL_DIR).filter(f => f.endsWith(".md")).length : 0;
  const dailyCount = existsSync(DAILY_DIR) ? readdirSync(DAILY_DIR).filter(f => f.endsWith(".md")).length : 0;
  const noteCount  = existsSync(DOCS_DIR) ? readdirSync(DOCS_DIR).filter(f => f.endsWith(".md")).length : 0;

  const banner = `${c.white}${c.bold}██╗     ██╗██╗  ██╗███████╗██████╗
██║     ██║██║  ██║██╔════╝██╔══██╗
██║     ██║███████║█████╗  ██████╔╝
██║     ██║██╔══██║██╔══╝  ██╔══██╗
███████╗██║██║  ██║███████╗██║  ██║
╚══════╝╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝${c.nc}`;

  console.clear();
  console.log();
  console.log(banner);
  console.log();
  console.log(`${c.dim}Gobernador · Multi-Agent Orchestration v2.0${c.nc}`);
  console.log();

  console.log(`${c.bold}Agentes:${c.nc}`);
  console.log(`  ${c.magenta}platon${c.nc}    opus-4-6    ${c.dim}·${c.nc}  ${c.yellow}pensador${c.nc}     ${c.dim}Read, Glob, Grep, WebFetch, WebSearch${c.nc}`);
  console.log(`  ${c.blue}quevedo${c.nc}   sonnet-4-6  ${c.dim}·${c.nc}  ${c.cyan}cronista${c.nc}     ${c.dim}Read, Write, Edit, Glob, Grep, Bash${c.nc}`);
  console.log(`  ${c.green}vinci${c.nc}     sonnet-4-6  ${c.dim}·${c.nc}  ${c.green}ejecutor${c.nc}     ${c.dim}Read, Write, Edit, Glob, Grep, Bash${c.nc}`);
  console.log();

  console.log(`${c.bold}Status:${c.nc}`);
  console.log(`  ${c.cyan}workspace:${c.nc}  LIHER`);
  console.log(`  ${c.cyan}branch:${c.nc}     ${c.green}${branch}${c.nc} ${c.dim}(${commits} commits)${c.nc}`);
  console.log(`  ${c.cyan}memoria:${c.nc}    ${sessions} sesiones · ${entities} entidades · ${skills} skills`);
  console.log(`  ${c.cyan}cronica:${c.nc}    ${dailyCount} dias`);
  console.log(`  ${c.cyan}vault:${c.nc}      ${noteCount} notas`);
  console.log();
  console.log(`  ${c.dim}hint: describe tu tarea · /help para comandos${c.nc}`);
  console.log();
}

// ── Help ────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`\n  ${c.bold}Comandos:${c.nc}`);
  console.log(`  ${c.cyan}/help${c.nc}               Mostrar esta ayuda`);
  console.log(`  ${c.cyan}/clear${c.nc}              Limpiar pantalla`);
  console.log(`  ${c.cyan}/agents${c.nc}             Listar agentes y roles`);
  console.log(`  ${c.cyan}/status${c.nc}             Estado del workspace`);
  console.log(`  ${c.cyan}/mem list${c.nc}           Listar sesiones y entidades`);
  console.log(`  ${c.cyan}/mem search <q>${c.nc}     Buscar en memoria`);
  console.log(`  ${c.cyan}/chronicle${c.nc}          Procesar sesiones (via Quevedo)`);
  console.log(`  ${c.cyan}/audit${c.nc}              Auditar vault (via Quevedo)`);
  console.log(`  ${c.cyan}/end${c.nc}                Guardar sesion y salir`);
  console.log(`  ${c.cyan}/exit${c.nc}               Salir sin guardar\n`);
}

// ── Memory helpers (shared with Platon) ─────────────────────────────────────

function listSessions() {
  if (!existsSync(SES_DIR)) return [];
  return readdirSync(SES_DIR).filter(f => f.endsWith(".md")).sort();
}

function listEntities() {
  if (!existsSync(ENT_DIR)) return [];
  return readdirSync(ENT_DIR).filter(f => f.endsWith(".md")).sort();
}

function showMemoryList() {
  const sessions = listSessions();
  const entities = listEntities();

  console.log(`\n  ${c.bold}Memoria${c.nc}`);
  if (sessions.length === 0) {
    console.log(`  ${c.dim}sessions: (vacio)${c.nc}`);
  } else {
    console.log(`  ${c.cyan}sessions (${sessions.length}):${c.nc}`);
    for (const f of sessions.slice(-5)) console.log(`    ${c.dim}·${c.nc} ${f.replace(".md", "")}`);
  }
  if (entities.length === 0) {
    console.log(`  ${c.dim}entities: (vacio)${c.nc}`);
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

function searchMemory(q) {
  const results = [];
  for (const dir of [SES_DIR, ENT_DIR]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith(".md"))) {
      const raw = readFileSync(resolve(dir, f), "utf-8");
      if (raw.toLowerCase().includes(q.toLowerCase())) {
        const idx = raw.toLowerCase().indexOf(q.toLowerCase());
        const start = Math.max(0, idx - 80);
        const end = Math.min(raw.length, idx + 200);
        const excerpt = raw.slice(start, end).replace(/\n/g, " ").trim();
        results.push({ file: f, excerpt });
      }
    }
  }
  return results;
}

// ── Session save ────────────────────────────────────────────────────────────

function ensureChronicleDir() {
  for (const dir of [CHR_DIR, DAILY_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function appendDailyLog(date, entry) {
  ensureChronicleDir();
  const filePath = resolve(DAILY_DIR, `${date}.md`);
  let content = "";
  if (existsSync(filePath)) {
    content = readFileSync(filePath, "utf-8");
  } else {
    content = `# Cronica — ${date}\n\n`;
  }
  content += `${entry}\n\n---\n\n`;
  writeFileSync(filePath, content, "utf-8");
}

// ── Config ──────────────────────────────────────────────────────────────────
const MODEL  = "claude-sonnet-4-6";
const EFFORT = "high";

// ── Interactive session ─────────────────────────────────────────────────────
async function main() {
  showSplash();

  // Build all prompts at startup
  const liherSystemPrompt  = buildLiherSystemPrompt();
  const platonSubPrompt    = buildPlatonSubPrompt();
  const quevedoSubPrompt   = buildQuevedoSubPrompt();
  const vinciSubPrompt     = buildVinciSubPrompt();

  let done              = false;
  let userResolve       = null;
  let lastAgentResponse = "";
  const sessionLog      = [];

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("close", () => { done = true; if (userResolve) userResolve(null); });

  const askUser = () => new Promise((res) => {
    if (done) { res(null); return; }
    rl.question(`  ${c.white}${c.bold}❯${c.nc} `, (a) => res(a));
  });

  // ── Spinner ─────────────────────────────────────────────────────────────────
  let spinnerInterval = null;
  let spinnerFrame = 0;
  const SPINNER_CHARS = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];

  function startSpinner() {
    if (spinnerInterval) return;
    spinnerFrame = 0;
    spinnerInterval = setInterval(() => {
      const frame = SPINNER_CHARS[spinnerFrame % SPINNER_CHARS.length];
      process.stdout.write(`\r  ${c.dim}${frame} pensando...${c.nc}    `);
      spinnerFrame++;
    }, 100);
  }

  function stopSpinner() {
    if (!spinnerInterval) return;
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write("\r" + " ".repeat(30) + "\r");
  }

  // ── Session lifecycle ───────────────────────────────────────────────────
  function startSession() {
    userResolve = null;

    async function* userMessages() {
      while (!done) {
        const input = await new Promise((res) => { userResolve = res; });
        if (input === null) return;
        sessionLog.push({ role: "user", text: input, time: new Date().toISOString() });
        yield { type: "user", message: { role: "user", content: input } };
      }
    }

    const abortController = new AbortController();

    const session = query({
      prompt: userMessages(),
      options: {
        allowedTools: [
          "Read", "Write", "Edit", "Glob", "Grep",
          "Bash", "WebFetch", "WebSearch",
        ],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        cwd: ROOT,
        systemPrompt: liherSystemPrompt,
        model: MODEL,
        effort: EFFORT,
        abortController,
        forwardSubagentText: true,
        agentProgressSummaries: true,
        agents: {
          platon: {
            description: "Llama a Platon cuando la tarea requiera analisis profundo, razonamiento arquitectonico o crear un plan de implementacion estructurado. Platon piensa pero no ejecuta. Devuelve un plan detallado.",
            prompt: platonSubPrompt,
            model: "claude-opus-4-6",
            effort: "max",
            permissionMode: "bypassPermissions",
            tools: ["Read", "Glob", "Grep", "WebFetch", "WebSearch"],
            maxTurns: 30,
          },
          quevedo: {
            description: "Llama a Quevedo para narrar y documentar: escribir cronica de la peticion, actualizar notas del vault en docs/, crear documentacion. Llama al inicio para narrar la peticion y al final para narrar el resultado.",
            prompt: quevedoSubPrompt,
            model: "claude-sonnet-4-6",
            effort: "high",
            permissionMode: "bypassPermissions",
            tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
            maxTurns: 20,
          },
          vinci: {
            description: "Llama a Vinci para ejecutar un plan de implementacion producido por Platon. Vinci escribe codigo, crea archivos, corre comandos, ejecuta tests. Siempre incluye el plan completo de Platon en el prompt. Vinci no piensa ni planifica — solo ejecuta.",
            prompt: vinciSubPrompt,
            model: "claude-sonnet-4-6",
            effort: "high",
            permissionMode: "bypassPermissions",
            tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
            maxTurns: 40,
          },
        },
      },
    });

    (async () => {
      try {
        let currentResponseText = "";
        for await (const message of session) {
          // ── task_started: sub-agente iniciado ───────────────────────────────
          if (message.type === "system" && message.subtype === "task_started") {
            stopSpinner();
            const meta = subagentMeta(message.subagent_type);
            console.log(`\n  ${meta.color}⟳ ${meta.name}${c.nc} ${c.dim}iniciando...${c.nc}`);
            logActivity(formatActivityLine({ ...message, subagent_type: message.subagent_type }));
            continue;
          }

          // ── task_progress: actualización de progreso ────────────────────────
          if (message.type === "system" && message.subtype === "task_progress") {
            stopSpinner();
            const meta = subagentMeta(message.subagent_type);
            if (message.summary) {
              process.stdout.write(`\r  ${meta.color}◎ ${meta.name}${c.nc}${c.dim}: "${message.summary.slice(0, 60)}"${c.nc}    \n`);
            } else if (message.last_tool_name) {
              process.stdout.write(`\r  ${c.dim}  └─ ${meta.name} › ${formatToolCall(message.last_tool_name, {})}${c.nc}    \n`);
            }
            logActivity(formatActivityLine(message));
            continue;
          }

          // ── task_notification: sub-agente completado ────────────────────────
          if (message.type === "system" && message.subtype === "task_notification") {
            stopSpinner();
            const meta = subagentMeta(message.subagent_type);
            const dur = message.usage?.duration_ms ? ` ${Math.round(message.usage.duration_ms / 1000)}s` : "";
            const tok = message.usage?.total_tokens ? ` · ${message.usage.total_tokens} tokens` : "";
            const icon = message.status === "completed" ? `${c.green}✓${c.nc}` :
                         message.status === "failed"    ? `${c.red}✗${c.nc}` : `${c.dim}○${c.nc}`;
            console.log(`  ${icon} ${meta.color}${meta.name}${c.nc} ${c.dim}${message.status}${dur}${tok}${c.nc}`);
            logActivity(formatActivityLine(message));
            continue;
          }

          // ── assistant: texto (de LIHER o de sub-agente) ────────────────────
          if (message.type === "assistant" && message.message?.content) {
            for (const block of message.message.content) {
              if ("text" in block && block.text) {
                stopSpinner();
                if (message.parent_tool_use_id) {
                  // Texto de sub-agente: gutter lateral, color dim
                  for (const line of block.text.split("\n")) {
                    process.stdout.write(`  ${c.dim}│ ${line}${c.nc}\n`);
                  }
                } else {
                  // Texto de LIHER: normal
                  currentResponseText += block.text;
                  for (const line of block.text.split("\n")) {
                    process.stdout.write(`  ${line}\n`);
                  }
                }
              } else if ("name" in block) {
                // Tool use block
                const toolStr = formatToolCall(block.name, block.input || {});
                if (message.parent_tool_use_id) {
                  console.log(`  ${c.dim}  └─ ${toolStr}${c.nc}`);
                } else {
                  console.log(`\n  ${c.dim}⚙ ${toolStr}${c.nc}`);
                }
              }
            }
          }

          // ── result: turno completado ────────────────────────────────────────
          if (message.type === "result") {
            stopSpinner();
            if (currentResponseText) {
              lastAgentResponse = currentResponseText.trim();
              sessionLog.push({
                role: "assistant",
                text: lastAgentResponse.slice(0, 2000),
                time: new Date().toISOString(),
              });
              currentResponseText = "";
            }
            if (message.subtype === "error" || message.is_error) {
              console.log(`\n  ${c.red}Error: ${message.result || message.errors?.join(", ") || "unknown"}${c.nc}`);
            }
            const sep = `  ${c.dim}${"─".repeat(56)}${c.nc}`;
            console.log(`\n${sep}\n`);
            logActivity(`${new Date().toISOString().slice(11,19)} -- turno completado`);
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

  // ── Slash commands ──────────────────────────────────────────────────────
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

      case "/end": {
        ensureChronicleDir();
        const now  = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toISOString().slice(11, 16);

        if (sessionLog.length > 0) {
          const userMsgs = sessionLog.filter(m => m.role === "user");
          const entry = [
            `### Sesion LIHER (${time})`,
            "",
            `- **Turnos**: ${sessionLog.length} mensajes`,
          ];
          if (userMsgs.length > 0) {
            entry.push(`- **Temas**: ${userMsgs.map(m => m.text.slice(0, 80).replace(/\n/g, " ")).join("; ")}`);
          }
          appendDailyLog(date, entry.join("\n"));
          console.log(`\n  ${c.green}✓ Cronica guardada en daily/${date}.md${c.nc}`);
        }

        console.log(`\n  ${c.dim}Hasta la proxima.${c.nc}\n`);
        done = true;
        rl.close();
        return true;
      }

      case "/agents":
        console.log(`\n  ${c.bold}Agentes del workspace${c.nc}\n`);
        console.log(`  ${c.magenta}ΠΛΑΤΏΝ${c.nc}   ${c.dim}opus-4-6  · max${c.nc}    Pensador — analiza, razona, produce planes`);
        console.log(`  ${c.blue}QUEVEDO${c.nc}  ${c.dim}sonnet    · high${c.nc}   Cronista — narra, documenta, mantiene vault`);
        console.log(`  ${c.green}VINCI${c.nc}    ${c.dim}sonnet    · high${c.nc}   Ejecutor — implementa planes, escribe codigo`);
        console.log(`\n  ${c.dim}LIHER (tu) coordina a los tres automaticamente.${c.nc}\n`);
        promptNextInput();
        return true;

      case "/status": {
        const { branch, commits } = getGitInfo();
        const ses = listSessions().length;
        const ent = listEntities().length;
        const skl = existsSync(SKL_DIR) ? readdirSync(SKL_DIR).filter(f => f.endsWith(".md")).length : 0;
        const dly = existsSync(DAILY_DIR) ? readdirSync(DAILY_DIR).filter(f => f.endsWith(".md")).length : 0;
        const nts = existsSync(DOCS_DIR) ? readdirSync(DOCS_DIR).filter(f => f.endsWith(".md")).length : 0;

        console.log(`\n  ${c.bold}Estado del workspace${c.nc}\n`);
        console.log(`  ${c.cyan}branch:${c.nc}     ${c.green}${branch}${c.nc} ${c.dim}(${commits} commits)${c.nc}`);
        console.log(`  ${c.cyan}memoria:${c.nc}    ${ses} sesiones · ${ent} entidades · ${skl} skills`);
        console.log(`  ${c.cyan}cronica:${c.nc}    ${dly} dias`);
        console.log(`  ${c.cyan}vault:${c.nc}      ${nts} notas\n`);
        promptNextInput();
        return true;
      }

      case "/mem": {
        const sub  = (parts[1] || "list").toLowerCase();
        const rest = parts.slice(2).join(" ");

        if (sub === "list") {
          showMemoryList();
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

      case "/chronicle":
        // Delegate to the LLM to invoke Quevedo
        console.log(`\n  ${c.dim}Enviando al agente: procesar cronica...${c.nc}\n`);
        userResolve("Procesa las sesiones no procesadas y genera la cronica diaria. Usa el comando /chronicle de Quevedo.");
        return true;

      case "/audit":
        // Delegate to the LLM to invoke Quevedo
        console.log(`\n  ${c.dim}Enviando al agente: auditar vault...${c.nc}\n`);
        userResolve("Audita el vault de Obsidian: busca notas huerfanas, enlaces rotos, y notas sin seccion 'Ver tambien'. Usa Quevedo para esto.");
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
      startSpinner();
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

// ── Exports para testing ────────────────────────────────────────────────────
export { subagentMeta, formatToolCall, formatActivityLine };

// ── Entry point ─────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\n${c.red}Fatal: ${err.message}${c.nc}\n`);
    process.exit(1);
  });
}
