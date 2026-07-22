# TRACKLIFE API (api-laravel)

Laravel 13 + PHP 8.3. Puerto 8000, dominio api.test. Auth via Sanctum
(`auth:sanctum`). MongoDB via `mongodb/laravel-mongodb` is the live default
connection — fully wired, not a pending integration.

## Archivos clave

- `routes/api.php` — toda la superficie REST (~15 controllers, auth/feed/
  workouts/meals/recipes/clubs/challenges/biometrics/exercises/favorites/
  wearables/coach/profile/search/dashboard). `routes/web.php` no se usa.
- `app/Models/` — 14 modelos Eloquent-Mongo (User, Workout, WorkoutPlan,
  MealEntry, Recipe, Club, Challenge, Exercise, BiometricReading, Activity,
  Product, Favorite, SocialPost, WearableConnection).
- `app/Http/Requests/` — un FormRequest por endpoint de escritura; toda
  validacion pasa por aca, nunca `$request->all()` directo a un modelo.
- `bootstrap/app.php` — config de middleware (Laravel 11+/13 style, no
  `app/Http/Kernel.php`): CORS, rate limiting (`throttle:60,1` api-wide,
  `throttle:5,1` en auth), y `trustProxies` para las redes Docker internas
  (necesario porque Traefik es el unico hop entre cliente y contenedor).
- `config/database.php` — `DB_CONNECTION` default es `mongodb`; sqlite ya no
  se usa.
- `docker-compose.yml` — `APP_ENV: local` / `APP_DEBUG: true` a proposito
  (config de dev/LAN, no de produccion — ver `.env.production.example`
  separado). Labels Traefik, CORS middleware, redes `traefik_net` +
  `backend_net`.

## Comandos

- Dev: `php artisan serve` (o via Docker: `make up` desde la raiz del repo)
- Test: `docker exec api-laravel php artisan test` (o `php artisan test` si
  corres fuera de Docker) — Strict TDD activo, PHPUnit
- Deps: `composer audit` para chequear CVEs conocidas
- Lint: `./vendor/bin/pint`

## Gobernanza

- **Modo**: hibrido (auto para edits/fixes, confirmar para cambios estructurales)
- **Branching**: feature branches desde el inicio (la superficie API requiere mas control)
- **Review**: estandar con verificacion de tests; cambios que tocan
  auth/seguridad pasan por el review adversarial 4R (risk/resilience/
  readability/reliability) antes de mergear
- **Escala**: ya superamos 10 endpoints (~15 controllers); versionado API
  (`v1/`) sigue sin implementarse — evaluar si se agregan breaking changes
