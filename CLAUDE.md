# CLAUDE.md — Workspace LIHER

Workspace central de Liher. Todos los proyectos se desarrollan aqui.
Ruta: `D:\Compartida\LIHER` (WSL2: `/mnt/d/Compartida/LIHER`)

## Estructura

```
LIHER/
├── CLAUDE.md
├── Makefile                 <- make up / make down / make ps
├── setup.sh                 <- primera vez: redes + env + infra
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

Al inicio de cada sesion de trabajo:

1. **Identificar proyecto**: determinar en que proyecto(s) se va a trabajar
2. **Cargar gobernanza**: leer el CLAUDE.md del proyecto para conocer modo,
   branching, y nivel de review
3. **Confirmar si es ambiguo**: solo preguntar si el contexto no queda claro
   (proyecto no identificable, cambio que afecta a multiples proyectos, o
   cambio estructural que contradice la gobernanza definida)
4. **Ejecutar**: trabajar segun los defaults del proyecto. Los defaults se
   ajustan editando el CLAUDE.md del proyecto cuando las necesidades cambien.

## Hosts (en cada equipo de la red)

```
192.168.20.123  web1.test web2.test web3.test api.test traefik.test portainer.test
```
