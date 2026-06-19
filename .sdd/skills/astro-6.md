---
skill: astro-6
version: "6.x"
projects: [web1-astro]
triggers: [astro, .astro, islands, astro:content, client:load, client:idle, client:visible]
---

# Astro 6 — Patrones del stack LIHER

## Filosofía: Islands Architecture

Astro genera HTML estático por defecto. Los componentes interactivos son "islas"
que se hidratan de forma independiente. Menos JS = mejor performance.

```
src/
  pages/         ← rutas (archivo → URL automático)
  layouts/       ← layouts reutilizables
  components/    ← .astro, .tsx, .vue mezclados
  content/       ← colecciones de contenido (MDX, JSON)
  styles/        ← CSS global
```

## Directivas de cliente (hidratación)

```astro
<!-- Solo hidrata cuando el componente es visible (lazy) -->
<ReactCounter client:visible />

<!-- Hidrata cuando el navegador está idle -->
<HeavyChart client:idle />

<!-- Hidrata inmediatamente (above the fold interactivo) -->
<NavMenu client:load />

<!-- Solo renderiza en el cliente (sin SSR) -->
<UserDashboard client:only="react" />
```

## Componentes .astro

```astro
---
// Frontmatter — código del servidor
import { getCollection } from "astro:content"
import Card from "../components/Card.astro"

const posts = await getCollection("blog")
const { title } = Astro.props
---

<!-- Template — HTML + expresiones -->
<article>
  <h1>{title}</h1>
  {posts.map(post => <Card post={post} />)}
</article>

<style>
  /* Scoped automáticamente al componente */
  h1 { color: var(--color-primary); }
</style>
```

## Content Collections (tipadas)

```ts
// src/content/config.ts
import { defineCollection, z } from "astro:content"

export const collections = {
  blog: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
    }),
  }),
}
```

```astro
---
import { getCollection, getEntry } from "astro:content"

// Todas las entradas
const posts = await getCollection("blog")

// Una entrada por slug
const post = await getEntry("blog", "mi-post")
const { Content } = await post.render()
---

<Content />
```

## Mezcla React + Vue en el mismo proyecto

```astro
---
import VueComponent from "../components/VueComponent.vue"
import ReactComponent from "../components/ReactComponent.tsx"
---

<VueComponent client:load />
<ReactComponent client:visible />
```

## View Transitions (Astro 6)

```astro
---
import { ViewTransitions } from "astro:transitions"
---

<head>
  <ViewTransitions />
</head>

<!-- Elementos con transición nombrada -->
<img transition:name="hero-image" src={post.image} />
```

## Anti-patterns

- `client:load` en componentes que no necesitan interactividad inmediata
- Lógica de negocio en componentes `.astro` (extraer a `src/lib/`)
- Importar todo React cuando solo se necesita un componente
- CSS global en `<style>` de componente (usar `is:global` si es necesario)
