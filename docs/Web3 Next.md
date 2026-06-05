# Web3 Next

Proyecto web basado en Next.js 14 (React SSR).

- **Dominio**: http://web3.test
- **Puerto interno**: 3000
- **Ruta**: `projects/web/web3-next/`
- **Framework**: Next.js 14

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `Dockerfile` | Imagen Node + scaffold automatico |
| `docker-entrypoint.sh` | Crea proyecto Next.js si no existe |
| `docker-compose.yml` | Labels Traefik, volumenes para node_modules y .next |

## Volumenes

- `/app/node_modules` — volumen anonimo (rendimiento)
- `/app/.next` — cache de build fuera de NTFS

## Estado

Funcionando correctamente desde 2026-06-03.

---

Ver tambien: [[Stack Web]], [[Traefik]]
