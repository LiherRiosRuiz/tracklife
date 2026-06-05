# Web2 Nuxt

Proyecto web basado en Nuxt 3 (Vue SSR).

- **Dominio**: http://web2.test
- **Puerto interno**: 3000
- **Ruta**: `projects/web/web2-nuxt/`
- **Framework**: Nuxt 3 (4.4.7)

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `Dockerfile` | Imagen Node + scaffold automatico |
| `docker-entrypoint.sh` | Crea proyecto Nuxt si no existe |
| `docker-compose.yml` | Labels Traefik, volumenes para node_modules y .nuxt |

## Volumenes

- `/app/node_modules` — volumen anonimo (rendimiento)
- `/app/.nuxt` — cache de build fuera de NTFS

## Estado

Funcionando correctamente desde 2026-06-03.

---

Ver tambien: [[Stack Web]], [[Traefik]]
