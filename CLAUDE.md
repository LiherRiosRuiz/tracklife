# CLAUDE.md — Workspace LIHER

Workspace central de Liher. Todos los proyectos se desarrollan aqui.
Ruta: `D:\Compartida\LIHER` (WSL2: `/mnt/d/Compartida/LIHER`)

## Estructura

```
LIHER/
├── CLAUDE.md
├── Makefile                 <- make up / make down / make ps
├── setup.sh                 <- primera vez: redes + env + infra
├── platon.sh                <- launcher SDD (ΠΛΑΤΩΝ)
├── .sdd/                    <- config SDD (config.yaml, skills.yaml, registries/)
├── .obsidian/               <- este directorio ES un vault de Obsidian
│
├── infra/                   <- infraestructura compartida (Docker via WSL2)
│   ├── traefik/             <- reverse proxy :80, dashboard :8080
│   ├── mongodb/             <- MongoDB 7 (red interna backend_net)
│   ├── portainer/           <- Portainer CE :9100 / portainer.test
│   └── scripts/             <- wsl-portforward.ps1, utilidades
│
├── projects/                <- todos los proyectos
│   └── web/                 <- stack web
│       ├── web1-astro/      <- Astro 6 + React 19 + Vue 3  -> web1.test
│       ├── web2-nuxt/       <- Nuxt 4 (Vue SSR)           -> web2.test
│       ├── web3-next/       <- Next.js 16 (React 19 SSR)  -> web3.test
│       └── api-laravel/     <- Laravel 13 + MongoDB        -> api.test
│
└── docs/                    <- notas Obsidian de documentacion
```

## Vault Obsidian

La raiz de `LIHER/` es un vault de Obsidian. Toda nota, decision o documentacion
vive aqui. Las notas estan en `docs/` y enlazan entre si con `[[wikilinks]]`.

## Comandos rapidos (desde WSL2)

```bash
cd /mnt/d/Compartida/LIHER

# Iniciar sesion SDD
bash platon.sh

# Primera vez
bash setup.sh

# Dia a dia
make up          # levanta todo
make down        # para todo
make ps          # estado
make web1-up     # solo web1
make logs-api    # logs del API
```

## Stack tecnico

| Capa | Tecnologia | Dominio local |
|------|-----------|---------------|
| Reverse proxy | Traefik v3 | traefik.test / :8080 |
| DB | MongoDB 7 | interno (backend_net) |
| Gestion contenedores | Portainer CE | portainer.test / :9100 |
| TRACKLIFE App | Next.js 16 (React SSR) | app.tracklife.test |
| TRACKLIFE Landing | Astro 6 | www.tracklife.test |
| Web 2 | Nuxt 4 (Vue SSR) | web2.test |
| TRACKLIFE API | Laravel 13 + MongoDB | api.tracklife.test |

## Arquitectura Docker

```
LAN -> Traefik (:80) -> web1/web2/web3/api (por Host header)
                         MongoDB (red interna, no expuesto)
Portainer :9100 <- gestion visual
```

**Redes Docker (WSL2):**
- `traefik_net` — Traefik + todos los servicios web
- `backend_net` — Laravel + MongoDB

## Platon (ΠΛΑΤΩΝ)

El framework SDD se llama Platon, por la Alegoria de la Caverna.
Cada sesion se inicia con `bash platon.sh` desde la raiz del workspace.
El launcher muestra el estado del workspace antes de iniciar Claude Code.

## Protocolo SDD

Artefactos en `.sdd/`:
- `config.yaml` — stack, fases, testing, calibracion, strict TDD
- `skills.yaml` — registry index (punteros a registries por proyecto)
- `registries/{proyecto}.yaml` — skills especificas de cada proyecto

Arquitectura: el orquestador lee `skills.yaml` (indice), identifica el
proyecto, y pasa al subagente el path `.sdd/registries/{proyecto}.yaml`.
El subagente recibe SOLO las skills de su proyecto, sin ruido.

Tres fases obligatorias antes de escribir codigo. No se salta ninguna.

### Fase 1: Preflight (deteccion)

Detecta el estado del workspace y lo registra en `.sdd/config.yaml`:

1. Leer config.yaml para contexto del stack
2. Identificar proyecto objetivo (buscar manifests: package.json, composer.json,
   go.mod, pyproject.toml, Cargo.toml — tabla en `manifest_detection` de skills.yaml)
3. Leer CLAUDE.md del proyecto (gobernanza: modo, branching, review)
4. Cargar el registry del proyecto: `.sdd/registries/{proyecto}.yaml`

Si el proyecto es ambiguo o el cambio contradice la gobernanza, preguntar.

### Fase 2: Calibracion (verificacion)

No se construye nada. Se verifica que lo detectado es real y funciona.
Checklist por proyecto (ver `calibration` en config.yaml):

- **Dependencias**: lock file coherente con manifest, deps instaladas
- **Runner de tests**: si `ready: true`, ejecutar y confirmar que pasa.
  Si `ready: false`, verificar que el install recomendado es viable
- **Lint**: si instalado, ejecutar y confirmar 0 errores
- **Build**: verificar que el proyecto compila sin errores
- **Config**: CLAUDE.md y registry coherentes con config.yaml
- **Edge cases**: .env, puertos, permisos, Docker, redes

Si un check blocker falla: resolver ANTES de seguir. No se pasa a TDD con fallos.

### Fase 3: Strict TDD Mode (construccion)

Solo se entra cuando la calibracion pasa. Todo codigo nuevo sigue el ciclo:

1. **RED**: escribir test que describe el comportamiento -> ejecutar -> FALLA
2. **GREEN**: implementacion minima para que pase -> ejecutar -> PASA
3. **REFACTOR**: limpiar sin cambiar comportamiento -> ejecutar -> sigue PASANDO

Reglas:
- No se escribe codigo de produccion sin test que lo exija
- Tests se ejecutan en cada paso (red, green, refactor)
- Un test que nunca falla no aporta confianza — verificar el RED
- Commits frecuentes: al menos uno por ciclo GREEN
- Scripts: ver `skills.test` en el registry del proyecto

## Hosts (en cada equipo de la red)

```
192.168.20.123  web1.test web2.test web3.test api.test traefik.test portainer.test
```
