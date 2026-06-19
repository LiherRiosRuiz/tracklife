# Web2 Nuxt

Proyecto sandbox con Nuxt 4 (Vue SSR). Independiente de TRACKLIFE.

- **Dominio**: `http://web2.test`
- **Puerto interno**: 3000
- **Contenedor**: `web2-nuxt`
- **Ruta**: `projects/web/web2-nuxt/`

---

## Stack técnico

| Paquete | Versión |
|---------|---------|
| nuxt | 4.4.6 |
| vue | 3.x (peer dep de Nuxt) |

---

## Estado

Proyecto scaffold estándar de Nuxt 4. Sin contenido de aplicación todavía.
Sirve como entorno de experimentación con Nuxt 4 y Vue SSR.

Contiene solo el `app/app.vue` por defecto y la configuración base.

---

## Configuración

**`nuxt.config.ts`**:
```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }   // Nuxt DevTools activo en dev
})
```

**`docker-compose.yml`**:
- Contenedor: `web2-nuxt`
- Traefik rule: `Host(web2.test)`
- Volúmenes: `web2_node_modules` (node_modules) + bind mount del código

---

## Docker

**Dockerfile**: `node:22-alpine`. Auto-scaffold si no hay `package.json`.

**`docker-entrypoint.sh`**: Crea proyecto Nuxt 4 si no existe, instala deps, lanza `npm run dev`.

---

## Comandos

```bash
make web2-up          # Desde LIHER/ — levanta en Docker
npm run dev           # Dev server local
npm run build         # Build SSR
```

---

Ver también: [[Stack Web]], [[Traefik]], [[Arquitectura Docker]]
