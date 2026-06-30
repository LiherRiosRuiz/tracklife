# Skill: Mobile-first + PWA + camino a Play Store

TrackLife va a Google Play como TWA. Aplica a `web3-next`. Incluye accesibilidad como checklist de entrega.

## Mobile-first
- **Touch targets ≥ 44×44px** (Apple HIG / Material). Botones, items de nav, checkboxes.
- **Safe areas**: usar `env(safe-area-inset-*)` en bottom-nav y headers (notch / barra de gestos). Meta `viewport-fit=cover`.
- **Bottom nav** como navegación primaria en móvil (`AppNav`); el pulgar alcanza abajo, no arriba.
- Gestos y scroll natural; evitar hovers como única affordance.

## PWA (Next 16)
- **Manifest** vía `app/manifest.ts` (`MetadataRoute.Manifest`): `name`, `short_name`, `description`, `start_url`, `display: "standalone"`, `background_color` (= `--color-bg`), `theme_color` (= `--color-accent`).
- **Iconos**: 192 y 512 + uno `purpose: "maskable"` 512 (requisito de instalabilidad y de TWA). `apple-touch-icon`.
- **Service worker**: para instalabilidad basta un SW que controle `start_url`. Offline avanzado → **Serwist** (`@serwist/next`), pero OJO: **requiere build con webpack**, no Turbopack (default de Next 16 dev). Decisión de arquitectura, aislar en su fase.
- **HTTPS obligatorio** para instalar. Dev: `next dev --experimental-https`.
- Push (retención): VAPID + `web-push`, opcional, fase posterior.

## Ruta a Google Play (TWA + Bubblewrap)
Por qué TWA y no Capacitor: la app es **SSR** (Server Components, `redirect()` server-side) con auth en **cookie httpOnly**. TWA carga el sitio real desde su origen → SSR y cookies funcionan sin tocar nada. Capacitor empaqueta un bundle estático y rompería ese modelo.

**GATE**: requiere **dominio público real + HTTPS** (hoy `app.tracklife.test` es local; no sirve). Primero: registrar dominio + desplegar.

Pasos:
1. PWA instalable (manifest + SW + iconos maskable). [Vinci]
2. `public/.well-known/assetlinks.json` con `package_name` + SHA256 fingerprints. [Vinci]
3. `npx @bubblewrap/cli init --manifest https://<dominio>/manifest.webmanifest`; configurar `twa-manifest.json`. [Vinci]
4. `bubblewrap build` → AAB firmado + keystore. **Custodia de keystore = humano** (si se pierde, no hay updates). [Vinci genera, humano custodia]
5. Crear Google Play Console (pago único 25 USD), subir AAB, activar **Play App Signing**. [humano]
6. Copiar el SHA256 de App Signing (Google **re-firma** el AAB) → añadir a `assetlinks.json` → redeploy. Si se omite, la TWA abre con barra de URL. [humano provee fingerprint, Vinci aplica]
7. Ficha (Health & Fitness), capturas, política de privacidad, content rating (IARC), data safety. [humano + Vinci]

## Accesibilidad (checklist de entrega)
- [ ] Contraste AA (tokens ya cumplen; verificar accent solo en texto grande).
- [ ] `:focus-visible` visible en todo interactivo.
- [ ] `prefers-reduced-motion` respetado (ver [[motion-ux]]).
- [ ] Labels/roles ARIA en iconos-botón; `alt` en imágenes.
- [ ] Navegable por teclado; orden de foco lógico.

Ver también: [[design-system]], [[nextjs-16]], [[devops-docker]].
