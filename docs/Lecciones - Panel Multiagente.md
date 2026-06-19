# Lecciones - Panel Multiagente

Aprendizajes técnicos reutilizables extraídos de la sesión del
2026-06-07 en la que se diseñó e implementó `panel.sh` (panel de
control tmux para LIHER, Platón, Quevedo y Vinci). Ver crónica completa
en `.sdd/chronicle/daily/2026-06-07-panel-multiagente.md`.

---

## 1. Bloqueos de permisos del sandbox: cómo diagnosticarlos

Durante la sesión, `Write`/`Edit`/redirección por Bash fallaban
repetidamente con mensajes contradictorios: el checker decía que
`D:\Compartida\LIHER` estaba permitido, pero rechazaba escrituras
dentro de ese mismo directorio ("Claude requested permissions to
write to ..., but you haven't granted it yet").

**Hallazgo clave**: el "te doy permiso" / "permiso a todo" del usuario
**por chat no sirve**. Esos mensajes confirman intención pero no
destraban el diálogo de aprobación — que es un elemento **visual** de
la interfaz que debe pulsarse en el momento exacto en que aparece. Si
no aparece o no se resuelve, el tool falla en silencio y el bloqueo
persiste, a veces resolviéndose solo en un reintento posterior sin
explicación visible.

**Cómo diagnosticar**:
- Si `Write` falla con "you haven't granted it yet" repetidamente pese
  a que la ruta está en el directorio permitido → es un bloqueo de
  diálogo de interfaz, no un problema de ruta o sintaxis. No insistir
  con variantes de ruta (forward/backslash, `/mnt/d` vs `/d` vs
  `D:\`) — todas fallarán igual.
- Confirmar que no hay cambios parciales: tras un fallo de `Edit`, leer
  el archivo de nuevo para verificar que el fallo fue atómico (no dejó
  el archivo a medias).
- Si el bloqueo es específico de un subdirectorio (p. ej.
  `.sdd/chronicle/daily/` bloqueado mientras la raíz del workspace no
  lo está), probar a escribir en sitios "hermanos" para acotar el
  alcance exacto del bloqueo antes de reportar.

**Hallazgo definitivo — `permissionMode: "auto"` en subagentes del SDK**:
el SDK de Claude Agent tiene dos capas de permisos independientes:
1. `allowedTools` (nivel de sesión) — lista de herramientas
   pre-aprobadas; **no se hereda automáticamente a subagentes**.
2. `permissionMode` (por agente) — controla cómo se gestionan las
   herramientas no pre-aprobadas. En modo `"default"` (heredado por
   los subagentes si no se especifica), Write/Edit/Bash piden
   confirmación interactiva al usuario. Si el REPL que orquesta (en
   este caso `liher.mjs`) **no implementa ese flujo de confirmación**,
   la petición se pierde y el tool falla silenciosamente con
   "you haven't granted permission" — exactamente el síntoma observado.

   **Fix**: añadir `permissionMode: "auto"` a la definición de cada
   subagente que necesite escribir (en `liher.mjs`, a Platón, Quevedo y
   Vinci — no a LIHER, que solo usa Read/Glob/Grep). El modo `"auto"`
   usa un clasificador de modelo para aprobar/denegar automáticamente
   sin prompt interactivo:
   ```js
   quevedo: {
     prompt: quevedoSubPrompt,
     model: "claude-sonnet-4-6",
     effort: "high",
     permissionMode: "auto",          // <- el fix
     tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
     maxTurns: 20,
   },
   ```
   Verificar el tipo `AgentDefinition` en
   `.sdd/cli/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`
   (línea ~91) para confirmar que el campo existe en la versión del SDK
   instalada.

---

## 2. Git Bash/MINGW vs WSL2: cómo distinguirlos y por qué importa

La herramienta Bash de la sesión resultó correr sobre **Git Bash /
MINGW de Windows**, no sobre WSL2 Ubuntu — algo no evidente a simple
vista.

**Cómo detectarlo**:
- `pwd` devuelve `/d/Compartida/LIHER` (mapeo estilo MINGW: `/d/...`)
  en vez de `/mnt/d/Compartida/LIHER` (mapeo estilo WSL2).
- Herramientas exclusivas de Linux (`tmux`, `watch`) no están
  disponibles: `command -v tmux` no devuelve nada.
- Invocar `wsl.exe` / `wsl -e bash -c "..."` para "saltar" a WSL2 cae
  en la lista de comandos que requieren aprobación explícita
  ("This command requires approval") — y esa aprobación tampoco se
  puede destrabar por chat, igual que los bloqueos de Write/Edit.

**Por qué importa**: cualquier plan que dependa de herramientas
Linux-only (tmux, en este caso) debe **calibrarse primero** verificando
en qué entorno corre realmente la sesión del agente — no asumir que
"Bash" implica WSL2 solo porque el workspace vive en una ruta
compartida con WSL2. Si el agente no tiene acceso real a WSL2, la
verificación final (smoke test) tiene que delegarse al usuario desde su
propia terminal WSL2 — que es justo lo que terminó pasando aquí.

---

## 3. El bug de `node.exe` sobrescribiendo títulos de tmux

**Síntoma**: tras lanzar `panel.sh`, los bordes de los 4 paneles
mostraban `C:\Program Files\nodejs\node.exe` en vez de los nombres de
los agentes (`LIHER (gobernador)`, `PLATON (pensador)`, etc.), pese a
que `panel.sh` los asignaba explícitamente con `tmux select-pane -T`.

**Causa**: `node.exe`, al arrancar los launchers vía interop
WSL2↔Windows, reescribe el título del terminal con secuencias de
escape — sobrescribiendo lo que tmux había guardado en `pane_title`.
A diferencia de los **nombres de ventana** (que tmux protege con
`allow-rename off`), tmux **no tiene un mecanismo de bloqueo para
`pane_title`**.

**Solución** (aplicada en `panel.sh`, líneas ~137-144): dejar de
depender de `#{pane_title}` y construir la etiqueta del borde
directamente a partir de `#{pane_index}` — un valor estable que ningún
proceso externo puede sobrescribir — usando condicionales de formato
de tmux:

```bash
PANE_LABEL='#{?#{==:#{pane_index},0},LIHER (gobernador),#{?#{==:#{pane_index},1},PLATON (pensador),#{?#{==:#{pane_index},2},QUEVEDO (cronista),VINCI (monitor)}}}'
tmux set-option -t "$SESSION" pane-border-format "#{?pane_active,#[fg=colour46],#[fg=colour240]} ${PANE_LABEL} "

# Refuerzo: que node.exe tampoco pueda renombrar la ventana
tmux set-window-option -t "$SESSION" allow-rename off
tmux set-window-option -t "$SESSION" automatic-rename off
```

**Patrón reutilizable**: cualquier vez que se lancen procesos que
controlan secuencias de escape de terminal (intérpretes Node/Python en
modo interactivo, REPLs, etc.) dentro de paneles tmux con etiquetas
fijas, preferir construir las etiquetas a partir de identificadores
**estructurales** (`pane_index`, `window_index`) en lugar de
identificadores **mutables por el proceso** (`pane_title`,
`window_name`).

---

## 4. `find_node()`: patrón para resolver Node en entornos híbridos WSL2/Windows

`panel.sh` falló en su primer lanzamiento real con
`Error: node no esta instalado` porque usaba `command -v node` — que no
encuentra nada en una instalación de WSL2 Ubuntu sin Node nativo.

Los launchers existentes (`liher.sh`, `platon.sh`, `quevedo.sh`) ya
resuelven este problema con una función `find_node()` que busca, en
orden:
1. `node` nativo en el `PATH` de WSL2
2. `node.exe` de Windows vía interop, típicamente en
   `/mnt/c/Program Files/nodejs/node.exe`

**Lección**: cuando un script nuevo necesita una herramienta que ya
resuelven los launchers del workspace (Node, en este caso), **reutilizar
exactamente esa función** en lugar de volver a comprobar con
`command -v`. El primer borrador de `panel.sh` no lo hizo, falló en la
verificación real del usuario, y se corrigió incorporando `find_node()`
— la misma lógica, palabra por palabra, que usan los tres launchers.
Esto es un caso concreto de "no reinventar lo que el workspace ya
resolvió": cualquier script nuevo que dependa de Node en este entorno
híbrido debe copiar/importar `find_node()`.

---

## 5. Race conditions al instalar dependencias compartidas desde procesos paralelos

Los tres launchers (`liher.sh`, `platon.sh`, `quevedo.sh`) comparten
`node_modules/` en `.sdd/cli/`. Cada uno, al arrancar, comprueba si
existe `node_modules` y, si no, ejecuta `npm install`.

**Riesgo identificado por Platón antes de construir**: si `panel.sh`
lanza los tres launchers simultáneamente (los 4 paneles se crean casi
a la vez) y `node_modules` aún no existe, los tres podrían disparar
`npm install` **concurrentemente sobre el mismo directorio**,
corrompiendo la instalación (escrituras simultáneas sobre el mismo
`package-lock.json` / árbol de paquetes).

**Mitigación aplicada**: `panel.sh` hace la comprobación e instalación
**una sola vez, de forma síncrona, antes de crear cualquier panel**:

```bash
if [ ! -d "$ROOT/.sdd/cli/node_modules" ]; then
  echo "Instalando dependencias del CLI (una sola vez)..."
  (cd "$ROOT/.sdd/cli" && npm install --silent)
fi
```

**Patrón reutilizable**: cuando un script orquestador lanza N procesos
hijos que comparten un recurso de instalación/inicialización
(`node_modules`, `vendor`, migraciones de base de datos, certificados
generados al vuelo, etc.), el orquestador debe garantizar la
inicialización **antes** de lanzar los hijos — nunca dejar que cada
hijo "se las arregle solo", porque eso convierte una comprobación
idempotente individual en una carrera de escrituras concurrentes.

---

Ver también: [[Liher Agente]], [[Vinci]], [[Platon SDD]], [[Quevedo]], [[Comandos]]
