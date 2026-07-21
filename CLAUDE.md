# CLAUDE.md — TrackLife

Workspace de TrackLife. Todos los proyectos se desarrollan aqui.

## Estructura

```
tracklife/
├── CLAUDE.md
├── Makefile                 <- make up / make down / make ps
├── setup.sh                 <- primera vez: redes Docker + env + infra
├── .claude/                 <- config Claude Code (gentle-ai: skills, agents, permisos)
├── .obsidian/                <- este directorio ES un vault de Obsidian
│
├── infra/                   <- infraestructura compartida (Docker)
│   ├── traefik/             <- reverse proxy :80, dashboard :8080
│   ├── mongodb/             <- MongoDB 7 (red interna backend_net)
│   ├── portainer/           <- Portainer CE :9100 / portainer.test
│   └── scripts/             <- utilidades
│
├── projects/                <- todos los proyectos
│   └── web/
│       ├── web1-astro/      <- Astro 6 (landing)          -> web1.test
│       ├── web2-nuxt/       <- Nuxt (scaffold sin relacion con TrackLife)
│       ├── web3-next/       <- Next.js 16 (app principal)  -> web3.test
│       └── api-laravel/     <- Laravel 13 + MongoDB        -> api.test
│
└── docs/                    <- notas Obsidian de documentacion del producto
```

## Vault Obsidian

La raiz de `tracklife/` es un vault de Obsidian. Toda nota, decision o documentacion
vive aqui. Las notas estan en `docs/` y enlazan entre si con `[[wikilinks]]`.

## Comandos rapidos

```bash
# Primera vez
bash setup.sh

# Dia a dia
make up          # levanta todo
make down        # para todo
make ps          # estado
make web-up      # solo los proyectos web (Next/Astro/Nuxt/Laravel)
make logs-api    # logs del API
```

## Stack tecnico

| Capa | Tecnologia | Dominio local |
|------|-----------|---------------|
| Reverse proxy | Traefik v3 | traefik.test / :8080 |
| DB | MongoDB 7 | interno (backend_net) |
| Gestion contenedores | Portainer CE | portainer.test / :9100 |
| TrackLife App | Next.js 16 (React SSR) | app.tracklife.test |
| TrackLife Landing | Astro 6 | www.tracklife.test |
| TrackLife API | Laravel 13 + MongoDB | api.tracklife.test |

## Arquitectura Docker

```
LAN -> Traefik (:80) -> web1/web3/api (por Host header)
                         MongoDB (red interna, no expuesto)
Portainer :9100 <- gestion visual
```

**Redes Docker:**
- `traefik_net` — Traefik + todos los servicios web
- `backend_net` — Laravel + MongoDB

## Planificacion y desarrollo

El flujo de trabajo SDD (spec-driven development) lo aporta `gentle-ai`
(skills `sdd-*` instaladas en `.claude/`), no un sistema propio del repo.
Ver `docs/Roadmap TrackLife.md` y `docs/Pendientes.md` para el estado y
prioridades reales del producto.

## Hosts (en cada equipo de la red)

```
192.168.20.123  web1.test web3.test api.test traefik.test portainer.test
```
