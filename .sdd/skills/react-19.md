---
skill: react-19
version: "19.x"
projects: [web1-astro, web3-next]
triggers: [react, tsx, jsx, component, useState, useEffect, use(), useActionState]
---

# React 19 — Patrones del stack LIHER

## Principios core

**Sin memoización manual** — el React Compiler la aplica automáticamente.
- NO usar `useMemo`, `useCallback`, `memo()` sin justificación de profiling
- Escribir lógica directa; confiar en el compilador para eficiencia

**Imports con named exports**
```tsx
// ✅
import { useState, useEffect, use } from "react"

// ❌
import React from "react"
import * as React from "react"
```

## Server Components (Next.js 16 / Astro 6)

- **Default: Server Component** — no necesita directiva
- `"use client"` solo cuando se necesita: state, event listeners, browser APIs
- Acceder a DB directamente en Server Components (sin API intermediaria)

```tsx
// ✅ Server Component — acceso directo a datos
async function UserProfile({ id }: { id: string }) {
  const user = await db.users.findOne(id)  // acceso directo
  return <div>{user.name}</div>
}

// ✅ Client Component — solo cuando necesita interactividad
"use client"
function Toggle() {
  const [open, setOpen] = useState(false)
  return <button onClick={() => setOpen(!open)}>{open ? "Cerrar" : "Abrir"}</button>
}
```

## Hook `use()` — React 19

```tsx
// Leer promesas con suspensión automática
import { use, Suspense } from "react"

function UserName({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)  // suspende hasta resolver
  return <span>{user.name}</span>
}

// Uso:
<Suspense fallback={<Spinner />}>
  <UserName userPromise={fetchUser(id)} />
</Suspense>
```

## `useActionState` — formularios con Server Actions

```tsx
"use client"
import { useActionState } from "react"

function ContactForm({ submitAction }: { submitAction: (state: any, fd: FormData) => Promise<any> }) {
  const [state, formAction, isPending] = useActionState(submitAction, null)
  return (
    <form action={formAction}>
      <input name="email" required />
      <button disabled={isPending}>{isPending ? "Enviando..." : "Enviar"}</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  )
}
```

## Refs como props (React 19)

```tsx
// ✅ React 19 — ref como prop directa
function Input({ ref, ...props }: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}

// ❌ Ya no necesario
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => ...)
```

## Anti-patterns

- `useMemo(() => computedValue, [deps])` sin benchmark que lo justifique
- `useEffect` para derivar estado (usar `useMemo` o calcular en render si es síncrono)
- Context para estado que cambia frecuentemente (usar Zustand)
- `useState` + `useEffect` para fetching (usar Server Components o React Query)
