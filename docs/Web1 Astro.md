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

### `/` — Landing principal (rediseño overhaul 2026-06-30)

**Diseño (en lockstep con app Web3 Next)**:
- **Hero**: "TRACKLIFE — Transformación física con datos"
  - Subtítulo: nutrición + entrenamiento + recuperación + comunidad
  - Gradiente de fondo (accent → cyan): radial, glow suave
  - CTA: "Empieza gratis" → `http://app.tracklife.test/registro` (botón accent)
- **Grid de 4 feature cards**: Nutrición, Entrenamiento, Biométricos, Comunidad
  - Descripciones concisas e inspiraciones (Yuka, Hevy, Strava, Whoop)
  - Iconos SVG (no emojis), colores por dominio (protein/carbs/fat)
- **Stats bar**: "Comunidad en tiempo real" — métricas numéricas
- **CTA final**: "Comienza tu transformación" con flecha
- **Nav**: Cómo funciona | Precios | Entrar a la app
- **Footer**: "TRACKLIFE © 2026 — Transformación física basada en datos"

**Estilo**: tokens OKLCH idénticos a web3-next (superficies verde-petróleo, accent lima). Tipografía Sora + JetBrains Mono. Sin emojis, sin dependencias CSS externas. Respeta prefers-reduced-motion. Focus-visible estándar (a11y).

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

## Design System (lockstep con web3-next)

Hereda los tokens OKLCH, fuentes y componentes de [[Web3 Next]]:
- **Superficies**: verde-petróleo oscuro (`--color-bg`, `--color-surface`)
- **Texto**: blanco verdoso (`--color-fg`)
- **Marca**: lima accent (`--color-accent`)
- **Tipografía**: Sora (display) + JetBrains Mono (datos)
- **Motion**: keyframes CSS (ring-fill, fade-in), respeta prefers-reduced-motion
- **A11y**: focus-visible, ::selection coloreada, alto contraste

**Componentes Astro** (islands React/Vue si aplica):
- Hero con gradiente y glow
- Feature cards con ícono SVG + texto
- CTA buttons (primario/secundario)
- Stats con números grandes (tabular)

---

## Historial de problemas resueltos

**2026-06-04** — `create-astro` creaba subdirectorios aleatorios cuando el directorio no estaba vacío.
- Solución: scaffoldear en `/tmp` y copiar a `/app`

**2026-06-04** — Vite 6 bloqueaba `web1.test` como host no permitido.
- Solución: añadir `allowedHosts` en `astro.config.mjs`

**2026-06-30** — Redesign overhaul (Bioluminiscencia).
- Tokens OKLCH inyectados en globals.css, heredados por layout Astro
- Fuentes Sora+JetBrains importadas en layout
- Hero + features rediseñados sin emojis

---

Ver también: [[TRACKLIFE]], [[Arquitectura Docker]], [[Traefik]], [[Web3 Next]]
