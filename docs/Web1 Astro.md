# Web1 Astro

Proyecto web basado en Astro 6 con islands de React y Vue.

- **Dominio**: http://web1.test
- **Puerto interno**: 4321
- **Ruta**: `projects/web/web1-astro/`
- **Framework**: Astro 6.4 + `@astrojs/react` + `@astrojs/vue`

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `Dockerfile` | Imagen `node:22-alpine` + git + bash |
| `docker-entrypoint.sh` | Scaffold via `/tmp` si no hay `package.json` |
| `docker-compose.yml` | Labels Traefik, volumen anonimo para node_modules |
| `astro.config.mjs` | Integraciones React/Vue, `allowedHosts: ['web1.test']` |

## Scaffold automatico

El entrypoint detecta si falta `package.json` y:
1. Crea el proyecto en `/tmp/astro-scaffold` (evita conflicto con dir no vacio)
2. Copia el resultado a `/app/`
3. Anade React y Vue con `astro add`
4. Arranca el dev server

## Problema resuelto (2026-06-04)

`create-astro` creaba subdirectorios aleatorios cuando el directorio no estaba
vacio. Solucion: scaffoldear en `/tmp` y copiar. Ademas, Vite 6 bloquea hosts
no permitidos — se anadio `allowedHosts` en `astro.config.mjs`.

---

Ver tambien: [[Stack Web]], [[Traefik]]
