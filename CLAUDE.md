# CLAUDE.md — Workspace LIHER

Workspace central de Liher. Todos los proyectos se desarrollan aqui.
Ruta: `D:\Compartida\LIHER` (WSL2: `/mnt/d/Compartida/LIHER`)

## Estructura

```
LIHER/
├── CLAUDE.md
├── Makefile                 <- make up / make down / make ps
├── setup.sh                 <- primera vez: redes + env + infra
├── .sdd/                    <- config SDD (config.yaml, skills.yaml)
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
| Web 1 | Astro 6 (React + Vue) | web1.test |
| Web 2 | Nuxt 4 (Vue SSR) | web2.test |
| Web 3 | Next.js 16 (React SSR) | web3.test |
| API | Laravel 13 | api.test |

## Arquitectura Docker

```
LAN -> Traefik (:80) -> web1/web2/web3/api (por Host header)
                         MongoDB (red interna, no expuesto)
Portainer :9100 <- gestion visual
```

**Redes Docker (WSL2):**
- `traefik_net` — Traefik + todos los servicios web
- `backend_net` — Laravel + MongoDB

## Protocolo SDD

Artefactos de configuracion en `.sdd/`:
- `.sdd/config.yaml` — contexto del stack, reglas por fase, testing capabilities
- `.sdd/skills.yaml` — registro de skills disponibles (proyecto + usuario + MCP)

Al inicio de cada sesion de trabajo:

1. **Cargar config**: leer `.sdd/config.yaml` para contexto del stack y reglas
2. **Identificar proyecto**: determinar en que proyecto(s) se va a trabajar
3. **Cargar gobernanza**: leer el CLAUDE.md del proyecto para modo, branching
   y nivel de review
4. **Verificar skills**: consultar `.sdd/skills.yaml` si la tarea requiere
   una herramienta especifica (linting, testing, MCP, etc.)
5. **Confirmar si es ambiguo**: solo preguntar si el contexto no queda claro
   (proyecto no identificable, cambio multi-proyecto, o cambio que contradice
   la gobernanza definida)
6. **Detectar testing**: verificar `testing.<proyecto>.ready` en config.yaml.
   Si el runner esta listo, activar strict TDD mode. Si no, instalar el
   runner recomendado antes de escribir codigo.
7. **Ejecutar**: trabajar segun los defaults. Ajustar editando el CLAUDE.md
   del proyecto o `.sdd/config.yaml` cuando las necesidades cambien.

### Strict TDD Mode

Cuando el runner esta `ready: true`, todo codigo nuevo sigue el ciclo:

1. **RED**: escribir test que describe el comportamiento esperado -> ejecutar
   -> debe FALLAR
2. **GREEN**: escribir implementacion MINIMA para que pase -> ejecutar ->
   debe PASAR
3. **REFACTOR**: limpiar sin cambiar comportamiento -> ejecutar -> sigue
   PASANDO

Reglas: no se escribe codigo de produccion sin test que lo exija. Commits
frecuentes (al menos uno por ciclo GREEN). Scripts en `.sdd/config.yaml`
seccion `strict_tdd.scripts_by_project`.

## Hosts (en cada equipo de la red)

```
192.168.20.123  web1.test web2.test web3.test api.test traefik.test portainer.test
```
