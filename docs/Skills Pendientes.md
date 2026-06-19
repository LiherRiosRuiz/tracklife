# Skills Pendientes

Analisis priorizado de capacidades, automatizaciones y patrones que le faltan
al ecosistema LIHER. Producido por [[Platon SDD|Platon]] (investigacion de
`.sdd/`, `config.yaml`, registries y [[Pendientes]]) a peticion de Liher,
2026-06-08.

---

## Nota arquitectonica previa

El workspace **no usa** `.claude/skills/` — crear archivos ahi no tendria
efecto. Las nuevas capacidades deben materializarse en uno de estos tres
canales:

1. **Skills de stack** — `.sdd/skills/*.md` (formato SKILL.md, cargadas en el
   system prompt de Platon)
2. **Automatizaciones** — targets de `Makefile` + scripts bash
3. **Slash commands** — en los CLIs de los agentes (`.sdd/cli/*.mjs`)

---

## Lo que ya existe

| Categoria | Inventario |
|-----------|-----------|
| Skills de stack | 10 archivos en `.sdd/skills/`: React 19, Next.js 16, Astro 6, Nuxt 4, Laravel 13, TypeScript strict, Tailwind 4, MongoDB+Laravel, DevOps Docker/Traefik/WSL2, Seguridad (las 3 ultimas anadidas 2026-06-08 — recomendaciones #1, #4, #7) |
| Automatizaciones | `Makefile` (25+ targets: + `portproxy`, `portproxy-install`, `mongo-backup`, `calibrate`, `test-setup`), `update-status.sh`, `setup.sh`, `guard.sh`, `calibrate.sh`, `test-bootstrap.sh`, `backup.sh`, `portproxy.sh` |
| Agentes | 4 agentes con CLIs propios y slash commands (`/mem`, `/decide` (anadido 2026-06-08, recomendacion #6), `/delegate`, `/end`, `/chronicle`, `/model`, `/help`, `/clear`) |

---

## Top 7 recomendaciones priorizadas

### 1. Skill MongoDB + laravel-mongodb — Esfuerzo: Bajo — COMPLETADO 2026-06-08

Archivo propuesto: `.sdd/skills/mongodb-laravel.md`

Documentar patrones de MongoDB 7 + `mongodb/laravel-mongodb@5.7`:
`DocumentModel`, `$collection`, embedded documents, operadores de query,
transacciones, anti-patterns de testing.

**Por que**: el target de DB es MongoDB pero `laravel-13.md` solo enseña
SQL/Eloquent — contradiccion que hara que Platon planifique mal y el Guardian
Angel revise con reglas equivocadas cuando llegue la migracion SQLite -> MongoDB
(ya listada en [[Pendientes]]).

**Entregado** (implementado por Liher directamente, sin pasar por Vinci —
tarea de contenido bien acotada):
- `.sdd/skills/mongodb-laravel.md` (236 lineas) — mismo formato que las 7
  skills existentes (frontmatter `skill/version/projects/triggers`). Cubre:
  trait `DocumentModel` + `$collection`, embedded documents (arrays
  casteados vs `embedsMany`/`embedsOne`), operadores de query Mongo
  (`regex`, `elemMatch`, atomicas `increment`/`push`/`pull`), indices via
  `Schema::connection("mongodb")`, transacciones (replica set requerido,
  alternativa con operaciones atomicas), por que `assertDatabaseHas` con
  sintaxis SQL falla con documentos anidados/arrays/BSON y el patron
  correcto (consultar el modelo, asertar sobre estructura PHP), y
  anti-patterns especificos de Mongo+Laravel
- `.sdd/registries/api-laravel.yaml` — anadida `- .sdd/skills/mongodb-laravel.md`
  a `skills_ref`, junto a `laravel-13.md`
- `.sdd/skills.yaml` — anadida entrada `mongodb-laravel: { file:
  mongodb-laravel.md, projects: [api-laravel] }` al indice, para que Platon
  la cargue en su system prompt

Resultado: la contradiccion Mongo-vs-SQL queda resuelta; Platon y el
Guardian Angel ya disponen de patrones correctos para cuando llegue la
migracion SQLite -> MongoDB. Skills de stack: 7 -> 8.

### 2. Calibration runner — Esfuerzo: Medio — COMPLETADO 2026-06-08

Propuesta: `make calibrate` + script `calibrate.sh`

Ejecutar automaticamente los checks de `config.yaml calibration.checks`,
actualizar `last_run`, `result`, `blockers[]`, `warnings[]`.

**Por que**: la calibracion es gate obligatoria antes de TDD (Fase 2 del
protocolo SDD) pero `last_run: null` — nunca se ha ejecutado. Es un paso
manual y no verificado; el protocolo lo exige pero nada lo automatiza.

**Entregado**:
- `.sdd/scripts/calibrate.sh` — corre los 6 bloques de checks de
  `calibration.checks` (dependencias, test runner, lint, build, coherencia de
  config, entorno), soporta filtrar por proyecto (`PROJECT=api-laravel`),
  detecta si los contenedores estan arriba para ejecutar `php artisan test` /
  `npm run lint` via `docker compose exec`, y hace SKIP explicito (con
  instrucciones) cuando no puede correr un check
- Persiste el resultado escribiendo directamente en
  `calibration.status` de `config.yaml` (`last_run`, `result`, `blockers[]`,
  `warnings[]`) — probado contra una copia del archivo antes de aplicarlo
- `make calibrate [PROJECT=...]` en el Makefile, documentado en `make help`

Resultado: la Fase 2 del protocolo SDD deja de ser un paso manual nunca
ejecutado — ahora es un comando que deja constancia escrita en `config.yaml`.

### 3. Test bootstrap frontends — Esfuerzo: Medio — COMPLETADO 2026-06-08

Propuesta: `make test-setup PROJECT=...`

Instalar runner de tests, crear config (`vitest.config.ts` o equivalente),
test ejemplo que pase, verificar que corre.

**Por que**: 3 de 4 proyectos (web1-astro, web2-nuxt, web3-next) tienen
`test_ready: false` — Strict TDD es fisicamente imposible en el 75% del
codebase. Los comandos de instalacion ya estan en `config.yaml` pero nadie
los ejecuta.

**Entregado**:
- `.sdd/scripts/test-bootstrap.sh` — por proyecto (`web1-astro`, `web2-nuxt`,
  `web3-next`): instala el runner recomendado dentro del contenedor
  (`docker compose exec`, porque `node_modules` vive en volumen nombrado),
  crea `vitest.config.ts` coherente con cada framework (Astro usa
  `getViteConfig`, Nuxt usa `defineVitestConfig` de `@nuxt/test-utils`, Next
  usa `@vitejs/plugin-react` + `jsdom`), escribe un test ejemplo que PASA
  (`sanity.test.ts`/`.tsx`), y ejecuta `npx vitest run` para confirmar el
  cableado antes de darlo por bueno
- Si el contenedor no esta arriba, el script lo detecta y da la instruccion
  exacta (`make {n}-up`) en lugar de fallar a ciegas
- `make test-setup PROJECT=web3-next` en el Makefile, documentado en `make help`
- `api-laravel` queda excluido explicitamente (ya tiene PHPUnit, `test_ready: true`)

Resultado: el primer ciclo RED→GREEN de Strict TDD queda desbloqueado para
los 3 proyectos que no podian ejecutarlo — solo falta correr el script con el
contenedor arriba para que `test_ready` pase a `true`.

### 4. Skill Docker/Traefik/WSL2 DevOps — Esfuerzo: Bajo-Medio — COMPLETADO 2026-06-08

Archivo propuesto: `.sdd/skills/devops-docker.md`

Documentar labels de Traefik, redes Docker (`traefik_net`, `backend_net`),
volumenes nombrados, `wsl-portforward.ps1`, edge cases (IP de WSL2 cambia en
cada reinicio, volumenes vacios, `pecl mongodb` no cargada).

**Por que**: hay 7 `docker-compose`, 2 redes, edge cases ya documentados en
`config.yaml` pero ninguna skill los codifica como guia positiva para los
agentes — el Guardian Angel solo tiene reglas negativas ("no hagas X").

**Entregado**:
- `.sdd/skills/devops-docker.md` — topologia (`traefik_net` vs `backend_net`
  y por que MongoDB nunca toca la primera), patron real de labels Traefik
  (extraido del `docker-compose.yml` de `api-laravel`), volumenes nombrados
  (por que, y el edge case de que quedan vacios al recrear el contenedor),
  donde viven las variables de entorno, port forwarding WSL2→Windows→LAN con
  el script real comentado, y un checklist de 7 edge cases de entorno
  derivado literalmente de `calibration.checks.environment`
- Anadida a `skills.yaml` y a los 4 registries de proyecto (`api-laravel`,
  `web1-astro`, `web2-nuxt`, `web3-next`) — es transversal, no de un solo stack
- Anadida a la tabla de triggers del Guardian Angel (`AGENTS.md`)

Resultado: el conocimiento implicito de infra (disperso entre `config.yaml`,
`Pendientes.md` y la cabeza de Liher) queda codificado como guia positiva que
Platon y el Guardian Angel pueden consultar.

### 5. Portproxy + backup MongoDB — Esfuerzo: Bajo — COMPLETADO 2026-06-08

Propuesta: `make portproxy` + `make mongo-backup`

Automatizar `wsl-portforward.ps1` (con Task Scheduler) y `mongodump` con
rotacion de backups.

**Por que**: dos puntos de fallo recurrentes ya listados explicitamente en
[[Pendientes]] — el script de portproxy existe pero requiere ejecucion manual
cada reinicio (la IP de WSL2 cambia), y MongoDB no tiene backups del volumen
nombrado.

**Entregado**:
- `infra/scripts/portproxy.sh` — wrapper WSL2→Windows que traduce la ruta con
  `wslpath` y lanza `wsl-portforward.ps1` elevado via `powershell.exe`
  (`Start-Process -Verb RunAs`)
- `infra/scripts/install-portproxy-task.ps1` — registra una tarea programada
  de Windows ("WSL2 PortForward") que ejecuta el reenvio automaticamente al
  iniciar sesion, con privilegios elevados — sin prompt UAC en cada arranque
- `infra/mongodb/backup.sh` — `mongodump --gzip --archive` dentro del
  contenedor, copia el dump a `infra/mongodb/backups/`, rota backups con mas
  de N dias (`MONGO_BACKUP_RETENTION_DAYS`, default 7), y muestra el comando
  exacto de restauracion (`mongorestore`) al terminar
- `make portproxy`, `make portproxy-install`, `make mongo-backup` en el
  Makefile, documentados en `make help`
- Directorio `infra/mongodb/backups/` creado

Resultado: los dos puntos de fallo recurrentes de [[Pendientes]] (portproxy
manual + sin backup de Mongo) tienen ahora automatizacion lista para usar.

### 6. Captura de decisiones — slash command `/decide` — Esfuerzo: Bajo — COMPLETADO 2026-06-08

Propuesta: comando nuevo en `.sdd/cli/platon.mjs`

Guardar decisiones arquitectonicas como entidades estructuradas (titulo,
fecha, contexto, decision, razon, alternativas descartadas) en
`.sdd/memory/entities/`, inyectadas automaticamente en futuras sesiones.

**Por que**: la memoria de Platon existe como infraestructura pero tiene 0
sesiones y 0 entidades — decisiones ya tomadas (Sanctum para auth, SQLite
temporal, Vitest sobre Jest, arquitectura de 4 agentes) no estan capturadas y
podrian contradecirse en el futuro.

**Entregado**:
- `saveDecision()` en `platon.mjs` — guarda una entidad con frontmatter
  `title/type: decision/date/updated` y cuerpo estructurado en 4 secciones
  fijas (`## Contexto`, `## Decision`, `## Razon`, `## Alternativas
  descartadas`) en `.sdd/memory/entities/decision-<slug>.md`
- Comando `/decide [titulo]` — encadena preguntas interactivas (igual patron
  que `/end`): titulo (o se toma del argumento), contexto, decision, razon,
  alternativas descartadas (opcional). Si no hay titulo, cancela limpio
- Anadido a `showHelp()` para que aparezca en `/help`
- Sintaxis verificada con `node --check platon.mjs`

Resultado: el sistema de memoria de Platon (construido pero con 0 entidades)
tiene ahora una via de baja friccion para capturar decisiones con formato
consistente — listas para inyectarse automaticamente en sesiones futuras via
`loadMemory()`.

### 7. Skill de seguridad — Esfuerzo: Bajo — COMPLETADO 2026-06-08

Archivo propuesto: `.sdd/skills/security.md`

Documentar patrones positivos: tokens Sanctum, CORS, CSP, validacion de input
(Zod / Form Requests), `.env` management, patrones de auth en React 19.

**Por que**: el Guardian Angel tiene 5 reglas negativas de seguridad pero
ningun patron positivo documentado — p.ej. el token de auth se guarda en
`localStorage` (documentado solo en TRACKLIFE.md como detalle de
implementacion, sin las implicaciones de seguridad ni mitigaciones).

**Entregado**:
- `.sdd/skills/security.md` — patron Sanctum + tokens en SPA tal y como esta
  implementado en TRACKLIFE (`AuthProvider`/`AuthGuard`, Bearer token), con
  secciones dedicadas a: por que el token vive en `localStorage` (decision
  consciente, no descuido) y que mitigaciones debe llevar (CSP estricta,
  sanitizacion, expiracion+revocacion, alternativa futura con cookies
  `HttpOnly`); CORS (`config/cors.php`, reglas de `allowed_origins` /
  `supports_credentials`); CSP via labels de Traefik; doble validacion
  Zod (frontend) + Form Requests (backend); gestion de `.env` y rotacion de
  secretos; anti-patterns que complementan (no repiten) las reglas del
  Guardian Angel
- Anadida a `skills.yaml` y a los 4 registries de proyecto (transversal)
- Anadida a la tabla de triggers del Guardian Angel (`AGENTS.md`)

Resultado: el Guardian Angel pasa de tener solo prohibiciones a contar con
guia positiva — y queda documentado, con sus implicaciones y mitigaciones, un
patron de seguridad real que antes solo aparecia como detalle de
implementacion en `TRACKLIFE.md`.

---

## Orden de ataque recomendado

1. **#1 (MongoDB)** — COMPLETADO 2026-06-08 — y **#6 (/decide)** — bajo
   esfuerzo, desbloquean sistemas ya construidos pero inertes.
2. **#3 (test bootstrap)** — sin esto el protocolo SDD no puede cumplirse en
   la mayoria del codebase (75% de los proyectos sin tests).
3. Resto segun disponibilidad: #4, #5, #7, #2.

**Estado: las 7 recomendaciones estan COMPLETADAS (2026-06-08).** Ver detalle
de lo entregado en cada seccion arriba. Pasos de seguimiento que requieren
accion humana (no automatizable desde aqui):
- `make portproxy-install` y `make calibrate` / `make test-setup PROJECT=...`
  requieren ejecutarse con el stack Docker arriba y, en el caso de portproxy,
  con permisos de Administrador en Windows — quedan listos pero pendientes de
  PRIMERA ejecucion por Liher
- Tras `make test-setup`, actualizar `test_ready: true` en `config.yaml` /
  `skills.yaml` para los proyectos donde el runner quede operativo

---

## Resumen de esfuerzo

| # | Skill / Automatizacion | Esfuerzo | Estado | Desbloquea |
|---|------------------------|----------|--------|-----------|
| 1 | Skill MongoDB + laravel-mongodb | Bajo | ✅ COMPLETADO 2026-06-08 | Migracion SQLite -> MongoDB |
| 6 | `/decide` (captura de decisiones) | Bajo | ✅ COMPLETADO 2026-06-08 | Memoria persistente de Platon |
| 5 | Portproxy + backup MongoDB | Bajo | ✅ COMPLETADO 2026-06-08 | Dos puntos de fallo de [[Pendientes]] |
| 7 | Skill de seguridad | Bajo | ✅ COMPLETADO 2026-06-08 | Guia positiva para Guardian Angel |
| 4 | Skill DevOps Docker/Traefik/WSL2 | Bajo-Medio | ✅ COMPLETADO 2026-06-08 | Guia positiva infra |
| 3 | Test bootstrap frontends | Medio | ✅ COMPLETADO 2026-06-08 | Strict TDD en 75% del codebase |
| 2 | Calibration runner | Medio | ✅ COMPLETADO 2026-06-08 | Gate Fase 2 del protocolo SDD |

**7/7 completadas.** Skills de stack: 7 -> 10 (`mongodb-laravel`,
`devops-docker`, `security`). Automatizaciones nuevas: `make calibrate`,
`make test-setup`, `make portproxy`, `make portproxy-install`,
`make mongo-backup`. Slash command nuevo: `/decide` en Platon.

---

Ver tambien: [[Platon SDD]], [[Pendientes]], [[Estado del Sistema]], [[Quevedo]]
