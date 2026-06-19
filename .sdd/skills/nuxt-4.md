---
skill: nuxt-4
version: "4.x"
projects: [web2-nuxt]
triggers: [nuxt, vue, composable, useAsyncData, useFetch, definePageMeta, server/api]
---

# Nuxt 4 — Patrones del stack LIHER

## Auto-imports

Nuxt 4 auto-importa composables, componentes y utils. No necesitas import explícito.

```ts
// ✅ Sin import — Nuxt los resuelve
const { data, pending, error } = await useFetch("/api/users")
const route = useRoute()
const router = useRouter()

// ❌ No necesario en Nuxt
import { useFetch } from "#app"
import MyComponent from "~/components/MyComponent.vue"
```

## Data Fetching

```vue
<script setup lang="ts">
// useFetch — SSR + cliente, cacheado automáticamente
const { data: users, pending, error, refresh } = await useFetch<User[]>("/api/users")

// useAsyncData — más control, para lógica custom
const { data: stats } = await useAsyncData("stats", () => $fetch("/api/stats"))

// $fetch — solo cliente (en eventos/handlers)
async function deleteUser(id: string) {
  await $fetch(`/api/users/${id}`, { method: "DELETE" })
  refresh()
}
</script>
```

## Composables (en `composables/`)

```ts
// composables/useAuth.ts — auto-importado en todo el proyecto
export function useAuth() {
  const user = useState<User | null>("user", () => null)

  async function login(credentials: LoginDto) {
    user.value = await $fetch("/api/auth/login", {
      method: "POST",
      body: credentials,
    })
  }

  function logout() {
    user.value = null
    navigateTo("/login")
  }

  return { user: readonly(user), login, logout }
}
```

## Server Routes (`server/api/`)

```ts
// server/api/users/index.get.ts
import { defineEventHandler, getQuery } from "h3"

export default defineEventHandler(async (event) => {
  const { page = 1 } = getQuery(event)
  return db.users.findAll({ page: Number(page) })
})

// server/api/users/[id].delete.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  await db.users.delete(id)
  return { success: true }
})
```

## Pages y layouts

```vue
<!-- pages/dashboard/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
})
</script>

<template>
  <div>Contenido del dashboard</div>
</template>
```

## Estado global con `useState`

```ts
// Compartido entre componentes (SSR-safe, hydration-safe)
const count = useState("counter", () => 0)
// → mismo estado en servidor y cliente
```

## Middleware

```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth()
  if (!user.value) return navigateTo("/login")
})
```

## Anti-patterns

- `localStorage` directamente en setup (SSR rompe — usar `useLocalStorage` de VueUse o verificar `import.meta.client`)
- `useFetch` dentro de event handlers (usar `$fetch`)
- `watch` para side effects en lugar de `watchEffect` o `useAsyncData`
- Mutación directa de `data.value` de useFetch (immutable — usar `refresh()`)
