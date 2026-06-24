// liher.test.mjs — Tests unitarios para funciones puras de liher.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { subagentMeta, formatToolCall, formatActivityLine } from './liher.mjs';

// ── subagentMeta tests ────────────────────────────────────────────────────────

describe('subagentMeta', () => {
  it('devuelve nombre y color para platon', () => {
    const m = subagentMeta('platon');
    assert.equal(m.name, 'ΠΛΑΤΏΝ');
    assert.ok(m.color.includes('\x1b['));
    assert.ok(m.icon);
  });
  it('devuelve nombre y color para quevedo', () => {
    const m = subagentMeta('quevedo');
    assert.equal(m.name, 'QUEVEDO');
    assert.ok(m.color.includes('\x1b['));
  });
  it('devuelve nombre y color para vinci', () => {
    const m = subagentMeta('vinci');
    assert.equal(m.name, 'VINCI');
    assert.ok(m.color.includes('\x1b['));
  });
  it('devuelve fallback para tipo desconocido', () => {
    const m = subagentMeta('alien');
    assert.equal(m.name, 'ALIEN');
    assert.ok(m.color);
  });
});

// ── formatToolCall tests ──────────────────────────────────────────────────────

describe('formatToolCall', () => {
  it('muestra filename para Read', () => {
    const r = formatToolCall('Read', { file_path: '/d/Compartida/LIHER/package.json' });
    assert.ok(r.includes('package.json'));
  });
  it('trunca command largo para Bash', () => {
    const r = formatToolCall('Bash', { command: 'a'.repeat(100) });
    assert.ok(r.length < 80);
  });
  it('muestra pattern para Grep', () => {
    const r = formatToolCall('Grep', { pattern: 'myFunction' });
    assert.ok(r.includes('myFunction'));
  });
  it('devuelve nombre para tool desconocida', () => {
    const r = formatToolCall('UnknownTool', {});
    assert.equal(r, 'UnknownTool');
  });
});

// ── formatActivityLine tests ──────────────────────────────────────────────────

describe('formatActivityLine', () => {
  it('formatea task_started con subagent_type', () => {
    const line = formatActivityLine({ subtype: 'task_started', subagent_type: 'platon', description: 'planificando' });
    assert.ok(line.includes('ΠΛΑΤΏΝ') || line.includes('platon') || line.includes('PLATON'));
    assert.ok(line.includes('iniciado') || line.includes('iniciando') || line.includes('working'));
  });
  it('formatea task_progress con summary', () => {
    const line = formatActivityLine({ subtype: 'task_progress', subagent_type: 'vinci', summary: 'Escribiendo tests', usage: { duration_ms: 5000, tool_uses: 2, total_tokens: 1000 } });
    assert.ok(line.includes('Escribiendo tests') || line.includes('vinci') || line.includes('VINCI'));
  });
  it('formatea task_notification completado', () => {
    const line = formatActivityLine({ subtype: 'task_notification', subagent_type: 'quevedo', status: 'completed', summary: 'Cronica guardada', usage: { duration_ms: 12000, tool_uses: 3, total_tokens: 2000 } });
    assert.ok(line.includes('completado') || line.includes('completed') || line.includes('QUEVEDO'));
  });
});
