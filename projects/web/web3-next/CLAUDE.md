# Web3 Next

Next.js 16 + React 19 + Tailwind 4. Puerto 3000, dominio web3.test.

Leer @AGENTS.md para advertencias sobre versiones de Next.js.

## Archivos clave

- next.config.ts — configuracion Next.js
- eslint.config.mjs — ESLint 9 flat config (core-web-vitals + typescript)
- postcss.config.mjs — Tailwind 4
- docker-compose.yml — labels Traefik, volumenes node_modules + .next
- docker-entrypoint.sh — scaffold automatico

## Comandos

- Dev: `npm run dev` (o via Docker: `make web3-up` desde LIHER/)
- Build: `npm run build`
- Lint: `npm run lint`

## Gobernanza

- **Modo**: hibrido (auto para edits/fixes, confirmar para cambios estructurales)
- **Branching**: commits directos a main (cambiar a feature branches cuando haya codigo custom)
- **Review**: estandar (funcionalidad + edge cases)
- **Escala**: proyecto ligero, sin split previsto
