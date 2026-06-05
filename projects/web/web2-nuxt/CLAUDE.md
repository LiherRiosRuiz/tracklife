# Web2 Nuxt

Nuxt 4 (Vue 3 SSR). Puerto 3000, dominio web2.test.

## Archivos clave

- nuxt.config.ts — configuracion Nuxt, devtools habilitados
- docker-compose.yml — labels Traefik, volumenes node_modules + .nuxt
- docker-entrypoint.sh — scaffold automatico

## Comandos

- Dev: `npm run dev` (o via Docker: `make web2-up` desde LIHER/)
- Build: `npm run build`

## Gobernanza

- **Modo**: hibrido (auto para edits/fixes, confirmar para cambios estructurales)
- **Branching**: commits directos a main (cambiar a feature branches cuando haya codigo custom)
- **Review**: estandar (funcionalidad + edge cases)
- **Escala**: proyecto ligero, sin split previsto
