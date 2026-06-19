# AGENTS.md — Gentleman Guardian Angel · LIHER Workspace

Cuando trabajes en este proyecto, aplica las reglas del skill relevante ANTES de escribir código.
El Guardian Angel revisará cada commit contra estas reglas.

## Skills disponibles

| Trigger | Skill | Ruta |
|---------|-------|------|
| PHP, Eloquent, artisan, Pest | `laravel-13` | `.sdd/skills/laravel-13.md` |
| React, tsx, useState, use() | `react-19` | `.sdd/skills/react-19.md` |
| Next.js, App Router, Server Action | `nextjs-16` | `.sdd/skills/nextjs-16.md` |
| Astro, .astro, client:load | `astro-6` | `.sdd/skills/astro-6.md` |
| Nuxt, composable, useFetch | `nuxt-4` | `.sdd/skills/nuxt-4.md` |
| TypeScript, ts, tsx, zod | `typescript-strict` | `.sdd/skills/typescript-strict.md` |
| Tailwind, className, @theme | `tailwind-4` | `.sdd/skills/tailwind-4.md` |
| MongoDB, collection, DocumentModel, embedded | `mongodb-laravel` | `.sdd/skills/mongodb-laravel.md` |
| Docker, compose, Traefik, WSL2, volume | `devops-docker` | `.sdd/skills/devops-docker.md` |
| Auth, Sanctum, token, CORS, CSP, validation | `security` | `.sdd/skills/security.md` |

---

## Reglas de revisión — Guardian Angel

### 1. Seguridad (BLOCKER)
- No hardcodear API keys, passwords, tokens ni secrets en código
- No incluir `.env` en commits
- No usar `eval()` ni `exec()` con input de usuario
- SQL: siempre usar ORM o prepared statements, nunca concatenar strings
- PHP: no usar `extract()` con input sin validar

### 2. Tests (BLOCKER en api-laravel, WARNING en frontends)
- **api-laravel**: todo feature nuevo debe tener Feature Test antes del PR
  - Ejecutar: `php artisan test` → debe pasar antes del commit
- **frontends**: si el runner no está instalado, documentar el test pendiente
- No subir código con `dd()`, `var_dump()`, `console.log()` de debug sin marcar como intencional

### 3. TypeScript (BLOCKER en frontends)
- Sin `any` sin justificación (comentario explicando por qué es inevitable)
- Sin `@ts-ignore` sin comentario
- Sin `as any` a menos que sea `as unknown as T` con razón documentada

### 4. React 19 (WARNING)
- Sin `useMemo`/`useCallback` sin benchmark que los justifique
- Sin `forwardRef` (usar ref como prop directa en React 19)
- `"use client"` solo cuando el componente necesita estado o eventos del navegador

### 5. Laravel (WARNING)
- Sin lógica de negocio en Controllers (usar Services o Actions)
- Sin `User::all()` en endpoints de listado (usar paginación)
- Form Requests para toda validación de entrada

### 6. Docker / Entorno (BLOCKER)
- No modificar `docker-compose.yml` de producción sin test en dev primero
- No exponer puertos sensibles (27017 MongoDB) fuera de redes internas Docker
- Variables de entorno: solo en `.env` (nunca en docker-compose directamente)

### 7. Estilo y formato (INFO)
- **Laravel**: pasar `./vendor/bin/pint` antes del commit
- **Frontends**: pasar `npm run lint` si está configurado
- Commits en español o inglés, consistente por proyecto

---

## Cómo aplica el Guardian Angel

1. Ejecutas `git commit`
2. El hook obtiene los archivos staged
3. Llama a `claude` con el diff + estas reglas
4. Si hay un BLOCKER: el commit se rechaza con explicación
5. Si hay WARNINGs: el commit pasa pero se muestra la revisión
6. Si todo OK: commit normal con `✓ Guardian Angel: OK`
