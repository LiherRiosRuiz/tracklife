# Web1 Astro — TRACKLIFE Landing

Landing page de TRACKLIFE. Astro 6 con islands React 19 + Vue 3.

- **Dominio**: `http://www.tracklife.test`
- **Puerto interno**: 4321
- **Contenedor**: `web1-astro`
- **Ruta**: `projects/web/web1-astro/`

---

## Stack técnico

| Paquete | Versión |
|---------|---------|
| astro | 6.4.4 |
| @astrojs/react | 5.0.7 |
| @astrojs/vue | 6.0.1 |
| react | 19.2.7 |
| vue | 3.5.35 |

---

## Páginas

```
src/pages/
├── index.astro           /     → Landing page principal
├── como-funciona.astro   /como-funciona
└── precios.astro         /precios
```

### `/` — Landing principal

Hero + grid de features + CTA de registro.

**Contenido:**
- Hero: "TRACKLIFE — Transformación física con datos"
- Subtítulo: nutrición + entrenamiento + recuperación + comunidad
- CTA: "Empieza gratis" → `http://app.tracklife.test/registro`
- Grid de 4 cards:
  - **Nutrición**: "Diario de comidas, escáner de productos estilo Yuka y macros personalizados"
  - **Entrenamiento**: "Log de gym estilo Hevi y cardio estilo Strava con historial completo"
  - **Biométricos**: "Sueño, HRV, strain y recuperación. Compatible con Zepp, Whoop y más"
  - **Comunidad**: "Feed social, retos, clubs y rankings para mantener la motivación"
- Nav: Cómo funciona | Precios | Entrar a la app
- Footer: "TRACKLIFE © 2026 — Transformación física basada en datos"

**Estilo**: dark tema inline (mismas variables que la app: `#0b1210`, `#22c55e`). Sin dependencias CSS externas.

---

## Configuración

**`astro.config.mjs`**:
```js
integrations: [react(), vue()],
vite: {
  server: {
    allowedHosts: ['www.tracklife.test', 'web1.test']
  }
}
```

Note: `allowedHosts` es necesario porque Vite 6 bloquea hosts no permitidos por defecto.

---

## Docker

**Dockerfile**: `node:22-alpine` + git + bash.

**`docker-entrypoint.sh`** — Scaffold automático:
1. Si no hay `package.json`: crea proyecto Astro en `/tmp/astro-scaffold` (evita conflictos con directorio no vacío)
2. Copia resultado a `/app/`
3. Ejecuta `astro add react vue` (añade integraciones)
4. Arranca: `npm run dev -- --host 0.0.0.0`

**`docker-compose.yml`**:
- Traefik rule: `Host(www.tracklife.test)`
- Volumen: `web1_node_modules` para `node_modules` en ext4 WSL2

---

## Historial de problemas resueltos

**2026-06-04** — `create-astro` creaba subdirectorios aleatorios cuando el directorio no estaba vacío.
- Solución: scaffoldear en `/tmp` y copiar a `/app`

**2026-06-04** — Vite 6 bloqueaba `web1.test` como host no permitido.
- Solución: añadir `allowedHosts` en `astro.config.mjs`

---

Ver también: [[TRACKLIFE]], [[Arquitectura Docker]], [[Traefik]]
