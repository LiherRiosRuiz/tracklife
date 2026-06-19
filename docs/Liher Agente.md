# Liher Agente

Gobernador del workspace LIHER. Punto de entrada unico que orquesta todos los agentes.

---

## Que hace

| Funcion | Descripcion |
|---------|-------------|
| Analizar | Entiende la peticion del usuario y determina el flujo |
| Coordinar | Activa los agentes necesarios en el orden correcto |
| Presentar | Entrega al usuario un resumen ejecutivo del resultado |

---

## Como lanzarlo

```bash
cd /mnt/d/Compartida/LIHER
bash liher.sh
```

---

## Arquitectura

```
Usuario
   |
   v
LIHER (sonnet-4-6, high)
   |
   +--- Platon (opus-4-6, max)    → Pensador: analiza, planifica
   |
   +--- Quevedo (sonnet-4-6, high) → Cronista: narra, documenta
   |
   +--- Vinci (sonnet-4-6, high)   → Ejecutor: implementa planes
```

---

## Flujos de orquestacion

| Flujo | Cuando | Agentes |
|-------|--------|---------|
| Completo | Tarea de implementacion | Quevedo + Platon + Vinci + Quevedo |
| Analisis | Solo pensar, no ejecutar | Platon |
| Documentacion | Solo vault/docs | Quevedo |
| Ejecucion directa | Tarea simple | Vinci (+ Quevedo si hay cambios) |

---

## Comandos

| Comando | Accion |
|---------|--------|
| `/help` | Mostrar ayuda |
| `/clear` | Limpiar pantalla |
| `/agents` | Listar agentes y roles |
| `/status` | Estado del workspace |
| `/mem list` | Listar sesiones y entidades |
| `/mem search <q>` | Buscar en memoria |
| `/chronicle` | Procesar sesiones (via Quevedo) |
| `/audit` | Auditar vault (via Quevedo) |
| `/end` | Guardar sesion y salir |
| `/exit` | Salir sin guardar |

---

## Modelo

| Aspecto | Valor |
|---------|-------|
| Modelo | claude-sonnet-4-6 |
| Effort | high |
| Tools propios | Read, Glob, Grep |
| Subagentes | platon, quevedo, vinci |

LIHER usa Sonnet (no Opus) porque su trabajo es enrutar y presentar, no razonar profundamente. Opus se reserva para Platon.

---

## Coexistencia con agentes standalone

| Launcher | Uso |
|----------|-----|
| `liher.sh` | Entrada principal — orquestacion automatica |
| `platon.sh` | Acceso directo a planificacion (sin orquestacion) |
| `quevedo.sh` | Acceso directo a cronica/vault (sin orquestacion) |

---

## Archivos

| Archivo | Ubicacion |
|---------|-----------|
| CLI | `.sdd/cli/liher.mjs` |
| Prompt | `.sdd/liher-prompt.md` |
| Launcher | `liher.sh` |

---

Ver tambien: [[Platon SDD]], [[Quevedo]], [[Vinci]], [[Lecciones - Panel Multiagente]], [[Home]]
