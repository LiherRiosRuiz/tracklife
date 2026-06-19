<div align="center">

# 🌐 TrackLife — Landing

**Sitio de marketing estático · Astro 6 · TypeScript**

[![Astro](https://img.shields.io/badge/Astro-6-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)

`www.tracklife.test`

</div>

---

Landing page pública de TrackLife. Generada estáticamente (SSG) para máximo rendimiento.

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Home — presentación del producto |
| `/como-funciona` | Explicación de la plataforma |
| `/precios` | Planes y precios |

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # build estático en ./dist/
npm run preview    # previsualizar build
```

## Docker

```bash
docker compose up --build
# disponible en www.tracklife.test (vía Traefik)
```

---

Parte de [TrackLife](../) · Stack: Astro 6 · TypeScript
