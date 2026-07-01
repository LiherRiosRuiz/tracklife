# LIHER — Workspace Central

Workspace donde todos los proyectos toman forma.
Ruta: `D:\Compartida\LIHER` | WSL2: `/mnt/d/Compartida/LIHER`

> Este vault es el núcleo operativo del servidor `192.168.20.123`. Toda nota, decisión y arquitectura vive aquí. Si algo no tiene nota, no está documentado.

---

## Proyecto activo: TRACKLIFE

[[TRACKLIFE]] es la aplicación principal del workspace. Plataforma de transformación física con datos: nutrición, entrenamiento, biométricos y comunidad.

| Pieza | Tecnología | Dominio |
|-------|-----------|---------|
| App | Next.js 16 + React 19 | app.tracklife.test |
| Landing | Astro 6 | www.tracklife.test |
| API | Laravel 13 + MongoDB | api.tracklife.test |

---

## Mapa del workspace

### Infraestructura
- [[Traefik]] — Reverse proxy, enruta por dominio Host header
- [[MongoDB]] — Base de datos compartida (backend_net)
- [[Portainer]] — UI de gestión de contenedores Docker
- [[Arquitectura Docker]] — Redes, volúmenes, port forwarding WSL2

### Proyectos
- [[TRACKLIFE]] — Visión completa del producto y sus módulos
- [[API Laravel]] — Backend REST, endpoints, modelos, servicios
- [[Web3 Next]] — TRACKLIFE App: Next.js 16, rutas, componentes
- [[Web1 Astro]] — TRACKLIFE Landing: Astro 6, páginas
- [[Web2 Nuxt]] — Proyecto sandbox Nuxt 4 (web2.test)

### Agentes (`projects/agentes/`)
- [[Liher Agente]] — Gobernador: orquesta Platon + Quevedo + Vinci
- [[Platon SDD]] — ΠΛΑΤΏΝ v2.0: planificador SDD, memoria, skills, delegacion, Guardian Angel
- [[Quevedo]] — Cronista del workspace: cronica de sesiones, documentacion activa del vault
- [[Vinci]] — Ejecutor: implementa los planes de Platon, escribe codigo

### Operaciones
- [[Cronica]] — Registro cronologico de sesiones del workspace
- [[Comandos]] — make up, make down, logs, etc.
- [[Hosts y DNS]] — Configuración de dominios .test
- [[Pendientes]] — Tareas abiertas
- [[Skills Pendientes]] — Analisis priorizado de Platon: 7 recomendaciones, todas completadas (2026-06-08)
- [[Lecciones - Panel Multiagente]] — Permisos del sandbox, Git Bash vs WSL2, bug de tmux/node.exe, find_node(), race conditions
- [[Mapa de Agentes]] — Canvas visual: agentes, proyectos y relaciones del workspace
- [[Estado del Sistema]] — Nota dinámica generada por `make status` (git, agentes, memoria, proyectos)

---

## Inicio rápido

```bash
cd /mnt/d/Compartida/LIHER

bash setup.sh        # Primera vez (redes Docker + infra)
make up              # Levantar todo
make ps              # Ver estado
bash platon.sh       # Iniciar sesión SDD
```

---

## Producción / Deploy

La rama `master` está lista para producción. Guía de pasos:
- [[Deploy TrackLife]] — arquitectura pública (Vercel + Railway + MongoDB Atlas), ruta gratis
- [[Publicar TrackLife - Guia paso a paso]] — checklist exacto de cuentas, variables y redirecciones

---

## Estado del workspace (2026-07-01)

| Componente | Estado |
|------------|--------|
| Traefik | ✓ Activo |
| MongoDB | ✓ Activo |
| Portainer | ✓ Activo |
| TRACKLIFE App | ✓ Activo (app.tracklife.test) — design system Bioluminiscencia + PWA |
| TRACKLIFE Landing | ✓ Activo (www.tracklife.test) — rediseño en lockstep |
| TRACKLIFE API | ✓ Activo (api.tracklife.test) — 84 tests, 318 assertions |
| web2-nuxt | ✓ Activo (web2.test) — proyecto sandbox |
| Platón SDD | v2.0 — memoria + skills + Guardian Angel |
| Quevedo | v1.0 — cronista del workspace |
| Liher Agente | v1.0 — gobernador multi-agente |
| Vinci | v1.0 — ejecutor (subagente de Liher) |
| Panel multi-agente | `make panel` — tmux 2x2 (LIHER/Platon/Quevedo/Vinci), WSL2 only |
