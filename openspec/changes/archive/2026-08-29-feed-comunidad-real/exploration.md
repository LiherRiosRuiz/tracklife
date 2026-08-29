# Exploration: Feed de comunidad real (P4.3)

Status: partial (see Note on tooling) — persisted by orchestrator after sub-agent delivered findings inline (sdd-explore has no Write tool in this project's agent config).

## Corrección de la premisa (verificado contra código real, no contra el roadmap)

`docs/Roadmap TrackLife.md` (líneas 120-125) está desactualizado. Dice que `GET /api/feed` devuelve mock y pide `POST /api/feed/{id}/like`. Ninguna de las dos cosas es cierta hoy:

- `GET /api/feed`, `POST /api/feed`, `POST /api/feed/{id}/kudos`, `POST /api/feed/{id}/comments` **ya son reales**, respaldados por un modelo Mongo `SocialPost` — no hay datos mock en `FeedController.php` ni `FeedService.php`.
- **No existe ningún endpoint `like`.** La acción de reconocimiento existente es `kudos` (solo-suma; una vez que un usuario da kudos no hay forma de quitarlo — `kudos_user_ids` solo evita el doble conteo del mismo click).
- `FeedList.tsx` (web3-next) **ya está conectado a la API real** (`api.kudos`), no a mock — renderiza un ícono `Heart` que llama a `POST /api/feed/{id}/kudos`.
- `FeedTest.php` ya tiene 13 tests de feature en verde cubriendo store/index/privacidad/paginación/kudos/comments.

El hueco real, más acotado de lo que sugiere el roadmap: **no existe ninguna relación de "seguir" (follow) en el código.** Documentado explícitamente en el propio código:

```
projects/web/api-laravel/app/Services/FeedService.php:161-171
NOTE: this codebase has no follow-graph / followers relationship yet
(verified: no "follow" model, table, or relation exists anywhere in
app/). Until one exists, 'followers'-visibility content is treated as
visible only to the poster themself, same as 'private'...
```

y reflejado en nombres/comentarios de tests de `FeedTest.php` (ej. `test_feed_index_hides_other_users_followers_only_post`).

## Estado actual

- **Modelo de datos**: `SocialPost` (Mongo, colección `social_posts`) — `user_id`, `type`, `payload`, `kudos_count`, `kudos_user_ids`, `comments`. `User` tiene `privacy_settings` (por tipo de contenido: `meals`, `product_scans`, `progress_photos`, `biometrics`, `workouts` → `public`|`followers`|`private`, defaults en `User::defaultPrivacySettings()`, validado en `UpdateProfileRequest`). **No hay un booleano único "perfil público"** — la visibilidad es por tipo de contenido, no por perfil.
- **FeedService** (`app/Services/FeedService.php`): `createPost`, `formatPost(s)`, `canView`, `isVisibleTo` (gate de privacidad, con la limitación documentada "followers == private por ahora"), y `paginateVisiblePosts` — un loop deliberado de sobre-fetch-y-ampliar que evita entregar una página incompleta cuando el filtro de privacidad ocurre en PHP después de un `skip/take` fijo de Mongo (la razón documentada liga este workaround directamente a la *ausencia* de un follow-graph con agregación).
- **Rutas** (`routes/api.php`, todas dentro de `auth:sanctum` salvo algunas lecturas públicas): `GET /feed`, `POST /feed`, `POST /feed/{id}/kudos`, `POST /feed/{id}/comments`. No hay ruta `like`.
- **Frontend**: `components/FeedList.tsx` llama a `api.kudos` (real), renderizado desde `app/app/comunidad/page.tsx` (autenticado) y `app/explorar/page.tsx` (landing pública/sin auth, `showKudos={false}`).
- **Bug encontrado**: `app/explorar/page.tsx` llama a `api.feed()` **sin token**, pero `GET /api/feed` está dentro del grupo `auth:sanctum` — esto da 401, silenciosamente tragado por `.catch(console.error)`, así que la página pública de explorar hoy siempre renderiza un feed vacío. Preexistente, adyacente al requisito de este cambio de "público si el perfil del autor es público".
- **Testing**: `api-laravel` está listo para TDD estricto (PHPUnit, trait `MongoTestCleanup` — solo dropea colecciones con sufijo `_testing`, con guarda). `web3-next` **no tiene vitest instalado** — TDD de frontend no es viable todavía (confirmado en `openspec/config.yaml`), mismo gap señalado en el change previo `2026-07-22-favoritos-nutricion-api`.

## Áreas afectadas

- `projects/web/api-laravel/app/Models/` — nuevo modelo `Follow` (no existe ninguno)
- `projects/web/api-laravel/app/Services/FeedService.php` — la rama `'followers'` de `isVisibleTo()` debe llamar a un chequeo de follow real en vez de tratarlo como solo-el-autor
- `projects/web/api-laravel/app/Http/Controllers/Api/FeedController.php` — probablemente necesita endpoints follow/unfollow (controller nuevo o extender `UserProfileController`), y una decisión sobre semántica kudos vs like
- `projects/web/api-laravel/routes/api.php` — nuevas rutas follow/unfollow; posible ruta `like`
- `projects/web/api-laravel/tests/Feature/FeedTest.php` — extender para casos reales de visibilidad por follow-graph (los tests actuales aseveran el comportamiento *interino* solo-autor, que habrá que actualizar/superseder)
- `projects/web/web3-next/components/FeedList.tsx`, `lib/api.ts` — wiring de UI kudos/like, estado de toggle
- `projects/web/web3-next/app/explorar/page.tsx` — bug del 401 en feed público, necesita decisión explícita
- `docs/Roadmap TrackLife.md` — desactualizado, debería corregirse sin importar qué approach se elija

## Approaches

### A. Relación de follow

1. **Colección Mongo dedicada `Follow`** `{follower_id, followed_id}` con índice único compuesto, siguiendo el patrón ya probado de `Favorite` de P4.2 (controller chico, `FollowTest.php` espeja `FavoriteTest.php`).
   - Pros: diff más chico y revisable, patrón ya probado en este código, toggle O(1) de follow/unfollow, soporta contadores de followers/following a futuro.
   - Contras: una colección + índice más para mantener.
   - Esfuerzo: Bajo-Medio.
2. **Embeber `following_ids: string[]` directo en `User`.**
   - Pros: sin colección nueva; lectura simple (`in_array`) para un solo viewer.
   - Contras: crecimiento sin límite del array en cuentas populares, sin query eficiente de "quién me sigue", condiciones de carrera en mutación de array con follow/unfollow concurrente, se aparta de la convención ya existente en este código ("colección chica dedicada": Favorite, SocialPost).
   - Esfuerzo: Bajo, pero acumula deuda técnica.
3. **Dual-write bidireccional (`followers_ids` + `following_ids` en ambos usuarios).**
   - Pros: lecturas rápidas en ambas direcciones.
   - Contras: dos escrituras que deben mantenerse sincronizadas, superficie de bugs real, redundante con que la opción 1 ya puede consultar el índice compuesto en cualquier dirección.
   - Esfuerzo: Medio-Alto, no vale la pena a la escala actual de la app.

**Recomendación: Opción 1** (modelo `Follow` dedicado), consistente con el propio razonamiento documentado de `FeedService` sobre por qué no empuja lógica de privacidad a pipelines de agregación "a la escala real de esta app."

### B. "Like" vs "kudos" existente

1. **Agregar `POST /api/feed/{id}/like` nuevo como toggle, mantener `kudos` como concepto aparte.**
   - Pros: coincide literalmente con el texto de ruta del roadmap.
   - Contras: dos sistemas de reconocimiento paralelos haciendo casi lo mismo sobre el mismo botón `Heart` — modelo de datos/UX confuso, sin señal de producto de que se quieran dos conceptos.
   - Esfuerzo: Bajo pero bajo valor.
2. **Convertir `kudos` en un `like` toggleable (misma ruta, agregar un-like), sin endpoint nuevo.**
   - Pros: un solo concepto de reconocimiento, coincide con lo que el botón Heart de `FeedList.tsx` ya sugiere visualmente (un like), el cambio más chico.
   - Contras: se aparta de la ruta literal del roadmap (`/like` vs `/kudos`) — una desviación documentada y explicable, como la Decisión 3 del proposal de P4.2 (DELETE con body-key), no un seguir-el-doc silencioso.
   - Esfuerzo: Bajo.
3. **Renombrar ruta+método `kudos → like` con semántica de toggle**, actualizar `FeedList.tsx`, `lib/api.ts` y `FeedTest.php` para que coincidan.
   - Pros: coincide con el naming del roadmap Y arregla el hueco del toggle.
   - Contras: rename disruptivo (se elimina la ruta `kudos` vieja) — hay que secuenciarlo con cuidado; el más grande de los tres pero igual de esfuerzo absoluto bajo.
   - Esfuerzo: Bajo-Medio.

**Recomendación: Opción 3** — esta es una decisión de naming/comportamiento que debería quedar explícita en el proposal (no auto-decidida en silencio), porque cambia el nombre de una ruta existente y testeada.

### C. Bug del feed sin auth en `explorar/page.tsx`

1. Fuera de alcance — dejarlo como bug preexistente conocido, señalar para un ticket de seguimiento.
2. Agregar una variante de `GET /api/feed` accesible para invitados, restringida a posts cuyo tipo resuelva `privacy_settings` como `public` (no hace falta filtrado scoped-a-viewer porque no hay viewer).

Dado el alcance declarado de esta tarea (visibilidad basada en follow, creación real de posts, like real), la Opción 1 (descope, señalado explícitamente) mantiene el cambio enfocado; la Opción 2 es una porción natural pero separada, adyacente a P4.3.

## Recomendación

Corregir la premisa antes de entrar a `sdd-propose`: esto no es "construir el feed desde cero", es un cambio más acotado de tres partes:

1. Agregar una relación `Follow` real (Opción A.1) y conectarla a la rama `'followers'` ya existente de `FeedService::isVisibleTo()` — esto sí es genuinamente nuevo.
2. Decidir explícitamente el naming kudos-vs-like (se recomienda B.3 — renombrar a `like` toggleable) en vez de dejar que un endpoint nuevo duplique en silencio al existente.
3. Decidir explícitamente el destino del bug de feed sin auth en `explorar` (se recomienda C.1 — descope, documentar) en vez de arreglarlo o ignorarlo en silencio.

`POST /api/feed` (creación de post) y `GET /api/feed` (lecturas filtradas por privacidad) ya funcionan correctamente y no necesitan reconstruirse — solo falta el insumo del follow-graph para su lógica de privacidad ya existente.

## Riesgos

- `web3-next` no tiene vitest instalado — TDD de frontend no es viable para este cambio hasta que se resuelva ese prerrequisito (mismo gap que el change P4.2 de favoritos).
- Ambigüedad de naming kudos/like: construir un endpoint `like` nuevo sin resolver esto arriesga tener dos sistemas de reconocimiento paralelos y confusos sobre el mismo botón de UI.
- El concepto nuevo de dominio `Follow` toca cardinalidad usuario-a-usuario; debe reusar la convención ya existente de la app ("escala chica, filtrado del lado de PHP") en vez de introducir `$lookup` de agregación Mongo (según la propia razón documentada de `FeedService`) para evitar deriva arquitectónica.
- Renombrar/eliminar la ruta `kudos` es un cambio disruptivo sobre un endpoint ya testeado y ya conectado en el frontend — necesita secuenciación (backend + frontend + tests juntos) para evitar un estado intermedio roto.
- La llamada sin auth a `api.feed()` en `explorar/page.tsx` es un **bug preexistente** (401, silenciosamente tragado) independiente de este cambio — debería señalarse al usuario/product owner aunque se deje fuera de alcance.
- `docs/Roadmap TrackLife.md` está desactualizado y contradice el código real; dejarlo sin corregir arriesga que un agente futuro redescubra esta misma premisa falsa de "datos mock".

## Listo para Proposal

Sí — con el alcance corregido de arriba. Alcance recomendado para `sdd-propose`: (1) modelo `Follow` + wiring en `FeedService`, (2) decisión explícita kudos→like, (3) decisión explícita sobre el bug del feed público en `explorar` (se recomienda descope), más una corrección del doc de roadmap.
