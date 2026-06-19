---
skill: security
version: "workspace-wide"
projects: [api-laravel, web1-astro, web2-nuxt, web3-next]
triggers: [auth, sanctum, token, login, cors, csp, security, validation, env, secret, xss, jwt]
---

# Seguridad — Patrones del stack LIHER

Esta skill complementa al Guardian Angel (`.sdd/guard/AGENTS.md`), que define
reglas NEGATIVAS ("no hagas X"). Aquí se documentan los patrones POSITIVOS ya
adoptados en el workspace — cómo se hace seguridad aquí, no solo qué se prohíbe.

## Auth: Sanctum + tokens en SPA (TRACKLIFE)

Decisión ya tomada y en producción (ver `docs/TRACKLIFE.md`): autenticación basada
en tokens de Laravel Sanctum, consumida desde un frontend React 19 (Next.js 16).

```
Cliente (React)              API (Laravel + Sanctum)
─────────────────            ───────────────────────
AuthProvider (context)  -->  POST /login  -> token
  user, token, loading       POST /register -> token
  login/register/logout      GET  /me     -> user actual
                             POST /logout -> revoca token

Cada request:
Authorization: Bearer <token>  -->  middleware auth:sanctum
```

**Patrón de cliente (React 19):**

- `AuthProvider`: contexto que expone `user`, `token`, `loading`, `login/register/logout`
- `AuthGuard`: componente que redirige a `/login` si no hay sesión (spinner mientras carga)
- Token enviado en cada petición como `Authorization: Bearer <token>`

**Decisión consciente — token en `localStorage`:**

El token se guarda en `localStorage` bajo la clave `tracklife_token`. Esto es una
decisión pragmática para una SPA sin SSR de sesión, pero tiene una implicación de
seguridad conocida: **cualquier XSS en la aplicación puede robar el token**
(a diferencia de una cookie `HttpOnly`, inaccesible desde JS).

Mitigaciones que deben acompañar esta decisión:

- **CSP estricta** (ver sección siguiente) — reduce drásticamente la superficie de XSS
- **Sanitización de cualquier contenido renderizado que provenga de input de usuario**
  (nunca `dangerouslySetInnerHTML` con datos no confiables)
- **Expiración de tokens corta + revocación activa** desde `/logout` y desde un
  panel de "sesiones activas" si el proyecto lo requiere
- Si en el futuro se prioriza mitigar XSS sobre simplicidad de implementación,
  la alternativa es migrar a cookies `HttpOnly` + `SameSite=Strict` con Sanctum
  SPA authentication (requiere mismo dominio raíz o configuración CORS de cookies)

```php
// Laravel: revocar token en logout
public function logout(Request $request)
{
    $request->user()->currentAccessToken()->delete();
    return response()->noContent();
}
```

```php
// Laravel: emitir token con expiración (config/sanctum.php)
'expiration' => 60 * 24, // minutos — ajustar según sensibilidad de la app
```

## CORS

Laravel gestiona CORS vía `config/cors.php` / middleware `HandleCors`. Reglas de LIHER:

- `paths`: limitar a `api/*` (y `sanctum/csrf-cookie` si se usa el flujo de cookies)
- `allowed_origins`: dominios `.test` explícitos en dev (`https://app.tracklife.test`,
  `https://www.tracklife.test`) — **nunca `*` cuando `supports_credentials: true`**
- `supports_credentials`: `true` solo si el flujo usa cookies; con Bearer tokens
  habituales no hace falta y reduce superficie de ataque mantenerlo en `false`

```php
// config/cors.php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['https://app.tracklife.test', 'https://www.tracklife.test'],
'supports_credentials' => false, // true solo si se migra a cookies HttpOnly
```

## CSP (Content Security Policy)

Mitigación principal contra XSS — especialmente relevante dado que el token de auth
vive en `localStorage` (ver arriba). Se configura a nivel de Traefik (header global)
o en el propio framework frontend:

```yaml
# Ejemplo de label Traefik para inyectar CSP en las respuestas
labels:
  - "traefik.http.middlewares.csp.headers.contentSecurityPolicy=default-src 'self'; script-src 'self'; connect-src 'self' https://api.tracklife.test"
  - "traefik.http.routers.web3.middlewares=csp"
```

Reglas mínimas:

- `default-src 'self'` como base — todo lo demás explícito
- `script-src` sin `'unsafe-inline'` ni `'unsafe-eval'` salvo necesidad documentada
- `connect-src` debe listar explícitamente los dominios `.test` de la API consumida

## Validación de input

Dos capas, una por lado del stack — nunca confiar en la validación del otro lado:

**Backend (Laravel) — Form Requests:**

```php
// app/Http/Requests/StoreActivityRequest.php
class StoreActivityRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            "title"    => ["required", "string", "max:255"],
            "tags"     => ["array"],
            "tags.*"   => ["string", "max:50"],
        ];
    }
}
```

**Frontend (TypeScript) — Zod:**

```ts
// schemas/activity.ts
import { z } from "zod";

export const activitySchema = z.object({
  title: z.string().min(1).max(255),
  tags: z.array(z.string().max(50)).optional(),
});

export type ActivityInput = z.infer<typeof activitySchema>;
```

Regla: si un dato cruza el límite cliente↔servidor, debe validarse en AMBOS lados.
La validación de Zod en frontend es UX (feedback inmediato); la de Form Request en
backend es la que realmente protege — nunca se debe omitir asumiendo que "el
frontend ya valida".

## Gestión de `.env` y secretos

- `.env` **nunca** se commitea (verificado por Guardian Angel — regla BLOCKER)
- `.env.example` sí se commitea, con placeholders, como documentación de qué
  variables necesita el proyecto
- Variables sensibles del workspace: `APP_KEY` (Laravel, cifrado de sesión/cookies),
  credenciales de `infra/mongodb/.env` (sin las cuales MongoDB no arranca — ver
  `calibration.checks.environment.env_files` en `config.yaml`)
- Rotación: si una key se filtra (commit accidental, log expuesto), regenerar
  inmediatamente (`php artisan key:generate` invalida sesiones existentes — coordinar
  con el estado de producción) y revocar tokens Sanctum activos

## Anti-patterns (complementan al Guardian Angel)

- Confiar en la validación del frontend como única barrera — el backend SIEMPRE valida
- `localStorage` para tokens sin CSP que mitigue el riesgo de XSS asociado
- `allowed_origins: ['*']` combinado con `supports_credentials: true` (combinación
  que los navegadores modernos rechazan, pero indica una config mal pensada)
- Tokens Sanctum sin expiración ni revocación al hacer logout
- Renderizar HTML de usuario con `dangerouslySetInnerHTML` sin sanitizar (DOMPurify o similar)
- Loggear tokens, contraseñas o payloads completos de auth en `console.log`/`Log::info`
