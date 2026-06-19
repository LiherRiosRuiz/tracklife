---
skill: nextjs-16
version: "16.x"
projects: [web3-next]
triggers: [next, nextjs, app router, page.tsx, layout.tsx, server action, route handler]
---

# Next.js 16 — Patrones del stack LIHER

## Estructura App Router

```
app/
  layout.tsx          ← root layout (wraps todo)
  page.tsx            ← ruta /
  (auth)/             ← route group (no afecta URL)
    login/page.tsx
  _components/        ← carpeta privada (excluida del routing)
  loading.tsx         ← UI de suspense automático
  error.tsx           ← error boundary de ruta
  not-found.tsx       ← 404 de ruta
  api/
    users/
      route.ts        ← Route Handler (GET, POST...)
```

## Server First

```tsx
// ✅ Server Component por defecto — acceso directo a datos
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.products.findById(params.id)
  return <ProductDetail product={product} />
}

// Metadata dinámica
export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = await db.products.findById(params.id)
  return { title: product.name }
}
```

## Server Actions

```tsx
// app/actions/users.ts
"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createUser(prevState: any, formData: FormData) {
  const name = formData.get("name") as string
  try {
    await db.users.create({ name })
    revalidatePath("/users")
    return { success: true }
  } catch (e) {
    return { error: "Error al crear usuario" }
  }
}
```

## Route Handlers

```ts
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const users = await db.users.findAll()
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const user = await db.users.create(body)
  return NextResponse.json(user, { status: 201 })
}
```

## Data Fetching paralelo

```tsx
// ✅ Paralelo con Promise.all
async function Dashboard() {
  const [users, stats] = await Promise.all([
    fetchUsers(),
    fetchStats(),
  ])
  return <DashboardView users={users} stats={stats} />
}

// ✅ Streaming con Suspense
function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<UsersSkeleton />}>
        <UsersSection />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>
    </div>
  )
}
```

## Middleware

```ts
// middleware.ts (raíz del proyecto)
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")
  if (!token) return NextResponse.redirect(new URL("/login", request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
}
```

## `server-only` para seguridad

```ts
// lib/db.ts
import "server-only"  // error de build si se importa en client

export async function getUsers() {
  return db.users.findAll()
}
```

## Anti-patterns

- `getServerSideProps` / `getStaticProps` (API Pages Router — no aplica en App Router)
- `useRouter().push()` para redirección en Server Actions (usar `redirect()` del server)
- Fetch en `useEffect` para datos iniciales (usar Server Component)
- `export default function Page()` sin `async` cuando necesita datos
