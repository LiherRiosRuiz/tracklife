# Stack Web

Grupo de 4 proyectos web + API detras de [[Traefik]], todos en `projects/web/`.

## Proyectos

| Proyecto | Framework | Dominio | Puerto interno | Ruta |
|----------|-----------|---------|----------------|------|
| [[Web1 Astro]] | Astro 6 + React + Vue | web1.test | 4321 | `projects/web/web1-astro/` |
| [[Web2 Nuxt]] | Nuxt 4 (Vue SSR) | web2.test | 3000 | `projects/web/web2-nuxt/` |
| [[Web3 Next]] / TRACKLIFE | Next.js 16 (React SSR) | app.tracklife.test | 3000 | `projects/web/web3-next/` |
| [[Web1 Astro]] landing | Astro 6 | www.tracklife.test | 4321 | `projects/web/web1-astro/` |
| [[API Laravel]] / TRACKLIFE API | Laravel 13 + MongoDB | api.tracklife.test | 8000 | `projects/web/api-laravel/` |

## Patron comun

Todos los proyectos web siguen el mismo patron Docker:

1. `Dockerfile` — imagen base con runtime (Node/PHP)
2. `docker-entrypoint.sh` — scaffold automatico si el proyecto esta vacio
3. `docker-compose.yml` — config, labels de Traefik, volumenes
4. Bind mount `.:/app` para hot-reload en desarrollo
5. Volumenes anonimos para `node_modules`/`vendor` (rendimiento NTFS)

## Levantar

```bash
cd /mnt/d/Compartida/LIHER
make web-up      # todas las webs
make web1-up     # solo Astro
make api-up      # solo Laravel
```

## CORS

[[API Laravel]] tiene middleware CORS en Traefik que permite peticiones desde
web1.test, web2.test y web3.test.

---

Ver tambien: [[Arquitectura Docker]], [[Comandos]], [[Traefik]]
