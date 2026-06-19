---
skill: typescript-strict
version: "5.x"
projects: [web1-astro, web2-nuxt, web3-next]
triggers: [typescript, ts, tsx, tsconfig, type, interface, zod, generic]
---

# TypeScript Strict — Patrones del stack LIHER

## Config base (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true
  }
}
```

## Types vs Interfaces

```ts
// Interface: para objetos extensibles (entidades, contratos)
interface User {
  id: string
  name: string
  email: string
}

// Type alias: para unions, intersecciones, primitivos
type UserId = string
type UserRole = "admin" | "user" | "guest"
type UserWithRole = User & { role: UserRole }
```

## No usar `any` — alternativas

```ts
// ❌ any
function process(data: any) { ... }

// ✅ unknown (fuerza narrowing)
function process(data: unknown) {
  if (typeof data === "string") { ... }
}

// ✅ generic
function process<T>(data: T): T { return data }

// ✅ Record para objetos dinámicos
const config: Record<string, string> = {}
```

## Narrowing con discriminated unions

```ts
type ApiResult<T> =
  | { status: "ok";    data: T }
  | { status: "error"; error: string }

function handleResult<T>(result: ApiResult<T>) {
  if (result.status === "ok") {
    // TypeScript sabe que result.data existe aquí
    return result.data
  }
  // TypeScript sabe que result.error existe aquí
  throw new Error(result.error)
}
```

## Validación en runtime con Zod 4

```ts
import { z } from "zod"

// Schema = validación + tipo inferido
const UserSchema = z.object({
  name:  z.string().min(1).max(255),
  email: z.string().email(),
  role:  z.enum(["admin", "user", "guest"]).default("user"),
})

type User = z.infer<typeof UserSchema>  // tipo automático

// En un Server Action / Route Handler
const result = UserSchema.safeParse(requestBody)
if (!result.success) {
  return { error: result.error.flatten() }
}
const user = result.data  // User tipado y validado
```

## Utility types útiles

```ts
// Campos opcionales de una entidad
type UpdateUserDto = Partial<Pick<User, "name" | "email">>

// Todos requeridos
type RequiredUser = Required<User>

// Solo lectura
type ReadonlyUser = Readonly<User>

// Excluir campos
type PublicUser = Omit<User, "password" | "internalId">
```

## Anti-patterns

- `as any` como escape hatch (usar `as unknown as T` si es inevitable)
- Tipos duplicados para la misma entidad (inferir con `z.infer<>` o `typeof`)
- `@ts-ignore` sin comentario explicando por qué
- Non-null assertions (`!`) sin verificar primero
