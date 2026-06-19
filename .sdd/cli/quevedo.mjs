#!/usr/bin/env node
// =============================================================================
// QUEVEDO — Cronista del Workspace LIHER v1.0
// Custom CLI using Claude Agent SDK.
// Documenta, cronifica, y mantiene el vault Obsidian.
// =============================================================================

import { query } from "@anthropic-ai/claude-agent-sdk";
import { createInterface } from "readline";
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync,
} from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dirname, "../..");
const SDD      = resolve(__dirname, "..");
const DOCS_DIR = resolve(ROOT, "docs");
const CHR_DIR  = resolve(SDD, "chronicle");
const DAILY_DIR    = resolve(CHR_DIR, "daily");
const SUMMARY_DIR  = resolve(CHR_DIR, "summaries");
const MANIFEST_PATH = resolve(CHR_DIR, "manifest.json");

// Claude Code session JSONL files
const SESSIONS_JSONL_DIR = resolve(
  process.env.USERPROFILE || process.env.HOME || "C:/Users/Administrador",
  ".claude/projects/D--Compartida"
);
// Platon session files
const PLATON_SES_DIR = resolve(SDD, "memory/sessions");

// ── Colores ─────────────────────────────────────────────────────────────────
const c = {
  bold: "\x1b[1m", dim: "\x1b[2m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", magenta: "\x1b[35m", red: "\x1b[31m", blue: "\x1b[34m",
  nc: "\x1b[0m",
};

// ── Chronicle ───────────────────────────────────────────────────────────────

function ensureChronicleDir() {
  for (const dir of [CHR_DIR, DAILY_DIR, SUMMARY_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { version: 1, lastRun: null, sessions: {} };
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  } catch { return { version: 1, lastRun: null, sessions: {} }; }
}

function saveManifest(manifest) {
  manifest.lastRun = new Date().toISOString();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

function discoverSessions() {
  const sessions = [];

  // Claude Code JSONL sessions
  if (existsSync(SESSIONS_JSONL_DIR)) {
    for (const f of readdirSync(SESSIONS_JSONL_DIR)) {
      if (!f.endsWith(".jsonl")) continue;
      const full = resolve(SESSIONS_JSONL_DIR, f);
      const stat = statSync(full);
      sessions.push({
        id: f.replace(".jsonl", ""),
        path: full,
        source: "claude-code",
        mtime: stat.mtime,
        size: stat.size,
      });
    }
  }

  // Platon session .md files
  if (existsSync(PLATON_SES_DIR)) {
    for (const f of readdirSync(PLATON_SES_DIR)) {
      if (!f.endsWith(".md")) continue;
      const full = resolve(PLATON_SES_DIR, f);
      const stat = statSync(full);
      sessions.push({
        id: f.replace(".md", ""),
        path: full,
        source: "platon",
        mtime: stat.mtime,
        size: stat.size,
      });
    }
  }

  return sessions.sort((a, b) => a.mtime - b.mtime);
}

function parseSessionJSONL(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter(l => l.trim());
  const messages = [];
  const toolsUsed = new Set();
  let firstTs = null;
  let lastTs = null;

  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    if (obj.timestamp) {
      if (!firstTs) firstTs = obj.timestamp;
      lastTs = obj.timestamp;
    }

    if (obj.type === "user" && obj.message?.content && !obj.isMeta) {
      let text = "";
      if (typeof obj.message.content === "string") {
        text = obj.message.content;
      } else if (Array.isArray(obj.message.content)) {
        text = obj.message.content
          .filter(b => b.type === "text" || typeof b === "string")
          .map(b => typeof b === "string" ? b : b.text || "")
          .join("\n");
      }
      // Skip command-only messages and tool results
      if (text && !text.startsWith("<command-name>") && !text.includes("tool_result")) {
        messages.push({ role: "user", text: text.slice(0, 500), timestamp: obj.timestamp });
      }
    }

    if (obj.type === "assistant" && obj.message?.content) {
      const blocks = obj.message.content;
      const textParts = [];
      for (const block of blocks) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
        }
        if (block.type === "tool_use" && block.name) {
          toolsUsed.add(block.name);
        }
      }
      if (textParts.length > 0) {
        messages.push({
          role: "assistant",
          text: textParts.join("\n").slice(0, 1000),
          timestamp: obj.timestamp,
        });
      }
    }
  }

  return {
    sessionId: basename(filePath, ".jsonl"),
    firstTimestamp: firstTs,
    lastTimestamp: lastTs,
    messageCount: messages.length,
    messages,
    toolsUsed: [...toolsUsed],
  };
}

function summarizeSession(parsed) {
  const { sessionId, firstTimestamp, lastTimestamp, messages, toolsUsed } = parsed;
  const date = firstTimestamp ? firstTimestamp.slice(0, 10) : "fecha desconocida";
  const timeStart = firstTimestamp ? firstTimestamp.slice(11, 16) : "?";
  const timeEnd = lastTimestamp ? lastTimestamp.slice(11, 16) : "?";

  // Extract user messages for topic detection
  const userMsgs = messages.filter(m => m.role === "user").map(m => m.text);
  const assistantMsgs = messages.filter(m => m.role === "assistant").map(m => m.text);

  // Detect files mentioned in tool calls
  const fileMentions = new Set();
  for (const msg of [...userMsgs, ...assistantMsgs]) {
    const fileMatches = msg.match(/(?:projects\/|docs\/|\.sdd\/|infra\/)[\w\-\/\.]+/g);
    if (fileMatches) fileMatches.forEach(f => fileMentions.add(f));
  }

  // Build summary
  const lines = [
    `### Sesion ${sessionId.slice(0, 8)} (${timeStart}–${timeEnd})`,
    "",
    `- **Mensajes**: ${messages.length} (${userMsgs.length} usuario, ${assistantMsgs.length} asistente)`,
  ];

  if (toolsUsed.length > 0) {
    lines.push(`- **Tools**: ${toolsUsed.join(", ")}`);
  }
  if (fileMentions.size > 0) {
    lines.push(`- **Archivos**: ${[...fileMentions].slice(0, 10).join(", ")}`);
  }

  // First and last user messages as context
  if (userMsgs.length > 0) {
    const first = userMsgs[0].slice(0, 150).replace(/\n/g, " ");
    lines.push(`- **Inicio**: "${first}${userMsgs[0].length > 150 ? "..." : ""}"`);
  }
  if (userMsgs.length > 1) {
    const last = userMsgs[userMsgs.length - 1].slice(0, 150).replace(/\n/g, " ");
    lines.push(`- **Final**: "${last}${userMsgs[userMsgs.length - 1].length > 150 ? "..." : ""}"`);
  }

  return lines.join("\n");
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

function loadRecentChronicle(days = 3) {
  if (!existsSync(DAILY_DIR)) return null;
  const files = readdirSync(DAILY_DIR).filter(f => f.endsWith(".md")).sort().slice(-days);
  if (files.length === 0) return null;
  const sections = files.map(f => readFileSync(resolve(DAILY_DIR, f), "utf-8").trim());
  return `\n\n---\n# CRONICA RECIENTE\n\n${sections.join("\n\n")}`;
}

function getChronicleStats() {
  const dailyCount = existsSync(DAILY_DIR)
    ? readdirSync(DAILY_DIR).filter(f => f.endsWith(".md")).length : 0;
  const summaryCount = existsSync(SUMMARY_DIR)
    ? readdirSync(SUMMARY_DIR).filter(f => f.endsWith(".md")).length : 0;
  const manifest = loadManifest();
  const processed = Object.keys(manifest.sessions).length;
  return { dailyCount, summaryCount, processed };
}

// ── Vault Graph ─────────────────────────────────────────────────────────────

function buildVaultGraph() {
  if (!existsSync(DOCS_DIR)) return new Map();
  const mdFiles     = readdirSync(DOCS_DIR).filter(f => f.endsWith(".md"));
  const canvasFiles = readdirSync(DOCS_DIR).filter(f => f.endsWith(".canvas"));
  const graph = new Map();

  // Initialize all notes (.md y .canvas — ambos son nodos validos del vault)
  for (const f of mdFiles) {
    const name = f.replace(".md", "");
    graph.set(name, { outbound: [], inbound: [], exists: true });
  }
  for (const f of canvasFiles) {
    const name = f.replace(".canvas", "");
    if (!graph.has(name)) graph.set(name, { outbound: [], inbound: [], exists: true });
  }

  // Parse wikilinks (solo .md — canvas son JSON, no markdown)
  for (const f of mdFiles) {
    const name = f.replace(".md", "");
    const raw = readFileSync(resolve(DOCS_DIR, f), "utf-8");
    // Strip code blocks y code spans antes de parsear wikilinks.
    // Evita falsos positivos como `[[Nota\|Alias]]` documentado en comentarios.
    const content = raw
      .replace(/```[\s\S]*?```/g, "")   // bloques de codigo
      .replace(/`[^`\n]+`/g, "");       // inline code spans
    // El .replace(/\\$/, "") elimina la barra invertida que Obsidian requiere en
    // tablas para escapar el pipe del alias: [[Nota\|Alias]] -> target "Nota"
    const links = [...content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)]
      .map(m => m[1].replace(/\\$/, ""));
    const unique = [...new Set(links)];

    for (const target of unique) {
      graph.get(name).outbound.push(target);
      if (!graph.has(target)) {
        graph.set(target, { outbound: [], inbound: [], exists: false });
      }
      graph.get(target).inbound.push(name);
    }
  }

  return graph;
}

function detectVaultIssues(graph) {
  const orphans = [];
  const broken = [];
  const noVerTambien = [];

  for (const [name, data] of graph) {
    // Orphans: no inbound links (except Home which is the hub)
    if (data.exists && data.inbound.length === 0 && name !== "Home") {
      orphans.push(name);
    }
    // Broken links: target doesn't exist
    if (!data.exists) {
      for (const source of data.inbound) {
        broken.push({ source, target: name });
      }
    }
  }

  // Check for "Ver tambien" section
  if (existsSync(DOCS_DIR)) {
    for (const f of readdirSync(DOCS_DIR).filter(f => f.endsWith(".md"))) {
      const content = readFileSync(resolve(DOCS_DIR, f), "utf-8");
      if (!content.includes("Ver tambi") && f !== "Home.md") {
        noVerTambien.push(f.replace(".md", ""));
      }
    }
  }

  return { orphans, broken, noVerTambien };
}

function formatGraph(graph) {
  const lines = [];
  const sorted = [...graph.entries()]
    .filter(([, d]) => d.exists)
    .sort(([a], [b]) => a.localeCompare(b));

  lines.push(`  ${c.bold}Vault Graph${c.nc} ${c.dim}(${sorted.length} notas)${c.nc}\n`);
  for (const [name, data] of sorted) {
    const inCount  = data.inbound.length;
    const outCount = data.outbound.filter(t => graph.get(t)?.exists).length;
    const brokenOut = data.outbound.filter(t => !graph.get(t)?.exists);
    const bar = "█".repeat(Math.min(inCount + outCount, 20));
    const brokenTag = brokenOut.length > 0 ? ` ${c.red}[${brokenOut.length} roto(s)]${c.nc}` : "";
    lines.push(`  ${c.cyan}${name.padEnd(25)}${c.nc} ${c.dim}←${inCount} →${outCount}${c.nc} ${c.blue}${bar}${c.nc}${brokenTag}`);
  }
  return lines.join("\n");
}

function getVaultStats() {
  const graph = buildVaultGraph();
  const issues = detectVaultIssues(graph);
  const noteCount = [...graph.values()].filter(d => d.exists).length;
  const linkCount = [...graph.values()].reduce((s, d) => s + d.outbound.length, 0);
  return { noteCount, linkCount, orphans: issues.orphans.length, broken: issues.broken.length };
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
  const chrStats = getChronicleStats();
  const vaultStats = getVaultStats();

  const banner = `${c.blue}${c.bold} ██████╗ ██╗   ██╗███████╗██╗   ██╗███████╗██████╗  ██████╗
██╔═══██╗██║   ██║██╔════╝██║   ██║██╔════╝██╔══██╗██╔═══██╗
██║   ██║██║   ██║█████╗  ██║   ██║█████╗  ██║  ██║██║   ██║
██║▄▄ ██║██║   ██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║  ██║██║   ██║
╚██████╔╝╚██████╔╝███████╗ ╚████╔╝ ███████╗██████╔╝╚██████╔╝
 ╚══▀▀═╝  ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝╚═════╝  ╚═════╝${c.nc}`;

  console.clear();
  console.log();
  console.log(banner);
  console.log();
  console.log(`${c.dim}QUEVEDO · Cronista del Workspace LIHER v1.0${c.nc}`);
  console.log();

  console.log(`${c.bold}Mode:${c.nc}`);
  console.log(`  ${c.blue}CHRONICLE + DOCS${c.nc}  ${c.dim}·${c.nc}  Quevedo documenta. El vault habla.`);
  console.log();
  console.log(`${c.bold}Model:${c.nc}`);
  console.log(`  ${c.blue}chronicler:${c.nc} claude-sonnet-4-6 ${c.dim}·${c.nc} effort: high`);
  console.log();

  console.log(`${c.bold}Status:${c.nc}`);
  console.log(`  ${c.cyan}workspace:${c.nc}   LIHER`);
  console.log(`  ${c.cyan}branch:${c.nc}      ${c.green}${branch}${c.nc} ${c.dim}(${commits} commits)${c.nc}`);
  console.log();

  console.log(`${c.bold}Chronicle:${c.nc}`);
  console.log(`  ${c.cyan}daily logs:${c.nc}  ${chrStats.dailyCount > 0 ? c.green + chrStats.dailyCount + c.nc : c.dim + "0" + c.nc}  ${c.dim}·${c.nc}  ${c.cyan}processed:${c.nc} ${chrStats.processed > 0 ? c.green + chrStats.processed + c.nc : c.dim + "0" + c.nc}  ${c.dim}·${c.nc}  ${c.cyan}summaries:${c.nc} ${chrStats.summaryCount > 0 ? c.green + chrStats.summaryCount + c.nc : c.dim + "0" + c.nc}`);
  console.log();

  console.log(`${c.bold}Vault:${c.nc}`);
  const orphanColor = vaultStats.orphans > 0 ? c.yellow : c.green;
  const brokenColor = vaultStats.broken > 0 ? c.red : c.green;
  console.log(`  ${c.cyan}notas:${c.nc}  ${c.green}${vaultStats.noteCount}${c.nc}  ${c.dim}·${c.nc}  ${c.cyan}links:${c.nc} ${c.green}${vaultStats.linkCount}${c.nc}  ${c.dim}·${c.nc}  ${c.cyan}huerfanas:${c.nc} ${orphanColor}${vaultStats.orphans}${c.nc}  ${c.dim}·${c.nc}  ${c.cyan}rotos:${c.nc} ${brokenColor}${vaultStats.broken}${c.nc}`);
  console.log();
  console.log(`  ${c.dim}hint: describe que documentar · /help para comandos${c.nc}`);
  console.log();
}

// ── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt() {
  const promptPath = resolve(SDD, "quevedo-prompt.md");
  const base = existsSync(promptPath)
    ? readFileSync(promptPath, "utf-8")
    : "Eres QUEVEDO — cronista del workspace LIHER. Documenta, cronifica, y mantiene el vault.";

  const chronicle = loadRecentChronicle();
  const graph     = buildVaultGraph();
  const issues    = detectVaultIssues(graph);

  // Build vault context
  let vaultCtx = "\n\n---\n# ESTADO DEL VAULT\n\n";
  vaultCtx += `Notas: ${[...graph.values()].filter(d => d.exists).length}\n\n`;
  vaultCtx += "| Nota | Enlaces entrantes | Enlaces salientes |\n";
  vaultCtx += "|------|-------------------|-------------------|\n";
  for (const [name, data] of [...graph.entries()].filter(([, d]) => d.exists).sort(([a], [b]) => a.localeCompare(b))) {
    vaultCtx += `| ${name} | ${data.inbound.length} | ${data.outbound.length} |\n`;
  }

  if (issues.orphans.length > 0) {
    vaultCtx += `\n**Huerfanas** (sin enlaces entrantes): ${issues.orphans.join(", ")}\n`;
  }
  if (issues.broken.length > 0) {
    vaultCtx += `\n**Enlaces rotos**: ${issues.broken.map(b => `${b.source} -> [[${b.target}]]`).join(", ")}\n`;
  }

  return base + (chronicle || "") + vaultCtx;
}

// ── Help ────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`\n  ${c.bold}Comandos:${c.nc}`);
  console.log(`  ${c.cyan}/chronicle${c.nc}          Procesar sesiones recientes (Claude Code + Platon)`);
  console.log(`  ${c.cyan}/audit${c.nc}              Analizar vault: huerfanas, enlaces rotos, coherencia`);
  console.log(`  ${c.cyan}/update <nota>${c.nc}      Pedir al LLM que actualice una nota del vault`);
  console.log(`  ${c.cyan}/sync${c.nc}               Chronicle + detectar notas que necesitan actualizacion`);
  console.log(`  ${c.cyan}/graph${c.nc}              Mostrar mapa de wikilinks del vault`);
  console.log(`  ${c.cyan}/log [N]${c.nc}            Mostrar ultimas N cronicas diarias (default: 3)`);
  console.log(`  ${c.cyan}/end${c.nc}                Guardar cronica de esta sesion y salir`);
  console.log(`  ${c.cyan}/clear${c.nc}              Limpiar pantalla`);
  console.log(`  ${c.cyan}/help${c.nc}               Mostrar esta ayuda`);
  console.log(`  ${c.cyan}/exit${c.nc}               Salir sin guardar\n`);
}

// ── Config ──────────────────────────────────────────────────────────────────
const MODEL  = "claude-sonnet-4-6";
const EFFORT = "high";

// ── Interactive session ─────────────────────────────────────────────────────
async function main() {
  showSplash();

  const systemPrompt    = buildSystemPrompt();
  let done              = false;
  let userResolve       = null;
  let lastAgentResponse = "";
  const sessionLog      = []; // Track all messages this session

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("close", () => { done = true; if (userResolve) userResolve(null); });

  const askUser = () => new Promise((res) => {
    if (done) { res(null); return; }
    rl.question(`  ${c.blue}❯${c.nc} `, (a) => res(a));
  });

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
        allowedTools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
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
              sessionLog.push({ role: "assistant", text: lastAgentResponse.slice(0, 2000), time: new Date().toISOString() });
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

  // ── Chronicle command ─────────────────────────────────────────────────────
  function runChronicle() {
    const allSessions = discoverSessions();
    const manifest = loadManifest();
    let processed = 0;

    for (const ses of allSessions) {
      const existing = manifest.sessions[ses.id];

      if (ses.source === "claude-code") {
        // Skip if already processed and file hasn't grown
        if (existing && existing.size >= ses.size) continue;

        console.log(`  ${c.dim}Procesando: ${ses.id.slice(0, 8)}... (${(ses.size / 1024).toFixed(0)}KB)${c.nc}`);
        const parsed = parseSessionJSONL(ses.path);

        if (parsed.messages.length < 2) {
          console.log(`  ${c.dim}  (saltado — menos de 2 mensajes)${c.nc}`);
          continue;
        }

        const summary = summarizeSession(parsed);
        const date = parsed.firstTimestamp ? parsed.firstTimestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);

        // Save summary
        const summaryFile = `${ses.id.slice(0, 8)}.md`;
        writeFileSync(resolve(SUMMARY_DIR, summaryFile), `---\nsession: ${ses.id}\nsource: claude-code\ndate: ${date}\nmessages: ${parsed.messageCount}\n---\n\n${summary}\n`, "utf-8");

        // Append to daily log
        appendDailyLog(date, `## Sesion Claude Code\n\n${summary}`);

        manifest.sessions[ses.id] = {
          source: "claude-code",
          processedAt: new Date().toISOString(),
          size: ses.size,
          summaryFile,
        };
        processed++;

      } else if (ses.source === "platon") {
        if (existing) continue;

        console.log(`  ${c.dim}Procesando Platon: ${ses.id}${c.nc}`);
        const content = readFileSync(ses.path, "utf-8");
        const body = content.replace(/^---[\s\S]*?---\n/, "").trim();
        const date = ses.id.slice(0, 10) || new Date().toISOString().slice(0, 10);

        appendDailyLog(date, `## Sesion Platon\n\n${body}`);

        manifest.sessions[ses.id] = {
          source: "platon",
          processedAt: new Date().toISOString(),
          size: ses.size,
        };
        processed++;
      }
    }

    saveManifest(manifest);
    return processed;
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

      case "/end": {
        // Save session log as daily entry
        ensureChronicleDir();
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toISOString().slice(11, 16);

        if (sessionLog.length > 0) {
          const userMsgs = sessionLog.filter(m => m.role === "user");
          const entry = [
            `### Sesion Quevedo (${time})`,
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

      case "/chronicle": {
        console.log(`\n  ${c.bold}Procesando sesiones...${c.nc}\n`);
        const count = runChronicle();
        if (count === 0) {
          console.log(`\n  ${c.dim}Todas las sesiones ya estan procesadas.${c.nc}\n`);
        } else {
          console.log(`\n  ${c.green}✓ ${count} sesion(es) procesada(s).${c.nc}\n`);
        }
        promptNextInput();
        return true;
      }

      case "/audit": {
        console.log();
        const graph = buildVaultGraph();
        const issues = detectVaultIssues(graph);

        if (issues.orphans.length === 0 && issues.broken.length === 0 && issues.noVerTambien.length === 0) {
          console.log(`  ${c.green}✓ Vault saludable — sin problemas detectados.${c.nc}\n`);
        } else {
          if (issues.orphans.length > 0) {
            console.log(`  ${c.yellow}Huerfanas${c.nc} (sin enlaces entrantes):`);
            for (const o of issues.orphans) console.log(`    ${c.dim}·${c.nc} ${o}`);
            console.log();
          }
          if (issues.broken.length > 0) {
            console.log(`  ${c.red}Enlaces rotos${c.nc}:`);
            for (const b of issues.broken) console.log(`    ${c.dim}·${c.nc} ${b.source} → [[${b.target}]]`);
            console.log();
          }
          if (issues.noVerTambien.length > 0) {
            console.log(`  ${c.dim}Sin "Ver tambien":${c.nc}`);
            for (const n of issues.noVerTambien) console.log(`    ${c.dim}·${c.nc} ${n}`);
            console.log();
          }
        }
        promptNextInput();
        return true;
      }

      case "/graph":
        console.log();
        console.log(formatGraph(buildVaultGraph()));
        console.log();
        promptNextInput();
        return true;

      case "/log": {
        const n = parseInt(parts[1]) || 3;
        if (!existsSync(DAILY_DIR)) {
          console.log(`\n  ${c.dim}Sin cronicas todavia. Ejecuta /chronicle primero.${c.nc}\n`);
          promptNextInput();
          return true;
        }
        const files = readdirSync(DAILY_DIR).filter(f => f.endsWith(".md")).sort().slice(-n);
        if (files.length === 0) {
          console.log(`\n  ${c.dim}Sin cronicas todavia.${c.nc}\n`);
        } else {
          for (const f of files) {
            const content = readFileSync(resolve(DAILY_DIR, f), "utf-8");
            console.log(`\n${content}`);
          }
        }
        promptNextInput();
        return true;
      }

      case "/update": {
        const noteName = parts.slice(1).join(" ");
        if (!noteName) {
          console.log(`\n  ${c.yellow}Uso: /update <nombre de la nota>${c.nc}\n`);
          promptNextInput();
          return true;
        }
        // Feed the update request to the LLM session
        const prompt = `Actualiza la nota del vault docs/${noteName}.md. Lee su contenido actual, revisa la cronica reciente y el estado del codigo, y reescribe las secciones que hayan cambiado. Preserva la estructura, wikilinks y la seccion "Ver tambien". Si la nota no existe, creala siguiendo el patron de las demas notas del vault.`;
        console.log(`\n  ${c.dim}Enviando al LLM: actualizar ${noteName}...${c.nc}\n`);
        userResolve(prompt);
        return true;
      }

      case "/sync": {
        console.log(`\n  ${c.bold}Paso 1: Procesando sesiones...${c.nc}\n`);
        const count = runChronicle();
        if (count > 0) {
          console.log(`  ${c.green}✓ ${count} sesion(es) procesada(s).${c.nc}`);
        } else {
          console.log(`  ${c.dim}Sesiones al dia.${c.nc}`);
        }

        console.log(`\n  ${c.bold}Paso 2: Analizando vault...${c.nc}\n`);
        const graph = buildVaultGraph();
        const issues = detectVaultIssues(graph);

        if (issues.orphans.length > 0 || issues.broken.length > 0) {
          console.log(`  ${c.yellow}Problemas encontrados:${c.nc}`);
          if (issues.orphans.length > 0) console.log(`    Huerfanas: ${issues.orphans.join(", ")}`);
          if (issues.broken.length > 0) console.log(`    Rotos: ${issues.broken.map(b => `${b.source}→${b.target}`).join(", ")}`);
        } else {
          console.log(`  ${c.green}✓ Vault saludable.${c.nc}`);
        }

        // Suggest notes that may need updating based on recent chronicle
        const recentChronicle = loadRecentChronicle(3);
        if (recentChronicle) {
          const noteNames = [...graph.keys()].filter(n => graph.get(n).exists);
          const mentioned = noteNames.filter(n => recentChronicle.toLowerCase().includes(n.toLowerCase()));
          if (mentioned.length > 0) {
            console.log(`\n  ${c.cyan}Notas mencionadas en cronica reciente:${c.nc}`);
            for (const n of mentioned) console.log(`    ${c.dim}·${c.nc} ${n} ${c.dim}(/update ${n})${c.nc}`);
          }
        }
        console.log();
        promptNextInput();
        return true;
      }

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

  // ── Start ───────────────────────────────────────────────────────────────
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
