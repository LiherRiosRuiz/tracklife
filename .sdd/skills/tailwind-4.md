---
skill: tailwind-4
version: "4.x"
projects: [web3-next]
triggers: [tailwind, css, @theme, @layer, @apply, className]
---

# Tailwind 4 — Patrones del stack LIHER

## Configuración CSS-first (Tailwind 4)

Tailwind 4 usa CSS como configuración. No hay `tailwind.config.js`.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Custom tokens que reemplazan o extienden el theme */
  --color-primary:   oklch(60% 0.2 240);
  --color-secondary: oklch(70% 0.15 300);
  --font-heading:    "Inter Variable", sans-serif;
  --radius-card:     0.75rem;
}
```

## Clases de utilidad — patrones comunes

```tsx
// Layout
<div className="flex items-center gap-4 p-6">

// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Dark mode
<div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">

// Custom token
<button className="bg-primary text-white rounded-card px-4 py-2">
```

## CSS Variables en componentes

```tsx
// Usar variables de @theme directamente
<div style={{ "--custom-height": "300px" } as React.CSSProperties}>

// O con clase Tailwind 4
<div className="h-[var(--custom-height)]">
```

## `@layer` para estilos base/componente/utilitario

```css
@layer components {
  .btn-primary {
    @apply bg-primary text-white px-4 py-2 rounded-card hover:opacity-90 transition-opacity;
  }
}
```

## Patrones cn() para clases condicionales

```tsx
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Uso
<button className={cn(
  "px-4 py-2 rounded-card font-medium",
  variant === "primary" && "bg-primary text-white",
  variant === "outline" && "border border-primary text-primary",
  disabled && "opacity-50 cursor-not-allowed"
)}>
```

## Anti-patterns

- `tailwind.config.js` con `extend.colors` (Tailwind 4 usa `@theme` en CSS)
- Inline styles para valores que pueden ser tokens CSS
- Clases de Tailwind dinámicas con string interpolation (Tailwind no puede detectarlas)
  ```tsx
  // ❌ No funciona — Tailwind no genera la clase
  <div className={`bg-${color}-500`}>
  // ✅ Objeto explícito o cn() con condiciones
  ```
