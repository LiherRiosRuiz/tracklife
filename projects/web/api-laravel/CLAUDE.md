# TRACKLIFE API (api-laravel)

Laravel 13 + PHP 8.3. Puerto 8000, dominio api.test.
MongoDB via mongodb/laravel-mongodb (package instalado, pendiente de cablear).

## Archivos clave

- routes/web.php — rutas web (aun no hay routes/api.php)
- app/Models/User.php — unico modelo (Eloquent default)
- config/database.php — conexiones DB (solo sqlite activa, mongodb pendiente)
- docker-compose.yml — labels Traefik, CORS middleware, redes traefik_net + backend_net
- docker-entrypoint.sh — scaffold automatico + composer install

## Comandos

- Dev: `php artisan serve` (o via Docker: `make api-up` desde LIHER/)
- Test: `php artisan test`
- Lint: `./vendor/bin/pint`

## Gobernanza

- **Modo**: hibrido (auto para edits/fixes, confirmar para cambios estructurales)
- **Branching**: feature branches desde el inicio (la superficie API requiere mas control)
- **Review**: estandar con verificacion de tests
- **Escala**: cuando haya >10 endpoints, considerar versionado API (v1/)
