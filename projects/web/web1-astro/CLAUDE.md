# Web1 Astro

Astro 6 + React 19 + Vue 3 islands. Puerto 4321, dominio web1.test.

## Archivos clave

- astro.config.mjs — integraciones React/Vue, allowedHosts
- docker-compose.yml — labels Traefik, volumen node_modules
- docker-entrypoint.sh — scaffold automatico

## Comandos

- Dev: `npm run dev` (o via Docker: `make web1-up` desde LIHER/)
- Build: `npm run build`

## Gobernanza

- **Modo**: hibrido (auto para edits/fixes, confirmar para cambios estructurales)
- **Branching**: commits directos a main (cambiar a feature branches cuando haya codigo custom)
- **Review**: estandar (funcionalidad + edge cases)
- **Escala**: proyecto ligero, sin split previsto
