<div align="center">

# ⚙️ TrackLife — API

**REST API · Laravel 13 · MongoDB 7 · Sanctum**

[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=flat-square&logo=laravel&logoColor=white)](https://laravel.com)
[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?style=flat-square&logo=php&logoColor=white)](https://php.net)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)

`api.tracklife.test`

</div>

---

Backend de TrackLife. API REST con autenticación Sanctum, integración MongoDB y servicios de IA para el coach y análisis de salud.

## Endpoints

| Grupo | Prefijo | Descripción |
|-------|---------|-------------|
| Auth | `/api/auth` | Login, registro, logout |
| Entrenamientos | `/api/workouts` | Historial y sesiones |
| Planes | `/api/workout-plans` | Planes de entrenamiento |
| Ejercicios | `/api/exercises` | Catálogo completo |
| Nutrición | `/api/meals` | Diario de comidas |
| Macros | `/api/macros` | Objetivos nutricionales |
| Recetas | `/api/recipes` | Recetas del usuario |
| Alimentos | `/api/products` | Búsqueda OpenFoodFacts |
| Biométricos | `/api/biometrics` | Lecturas de salud |
| Actividad | `/api/activities` | Registro de actividad |
| Coach | `/api/coach` | Insights y plan IA |
| Comunidad | `/api/feed` `/api/clubs` `/api/challenges` | Social |
| Dashboard | `/api/dashboard` | Resumen general |

## Servicios internos

| Servicio | Descripción |
|---------|-------------|
| `CoachService` | Generación de planes y recomendaciones IA |
| `HealthScoreService` | Cálculo de puntuación de salud integral |
| `OpenFoodFactsService` | Integración con base de datos de alimentos |
| `StreakService` | Sistema de rachas y logros |
| `FeedService` | Agregación del feed social |

## Desarrollo

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed              # ejercicios + datos de prueba
php artisan serve                # http://localhost:8000
```

## Docker

```bash
docker compose up --build
# disponible en api.tracklife.test (vía Traefik)
```

## Variables de entorno clave

```env
DB_CONNECTION=mongodb
DB_URI=mongodb://mongodb:27017
DB_DATABASE=tracklife

SANCTUM_STATEFUL_DOMAINS=app.tracklife.test
```

## Tests

```bash
php artisan test
php artisan test --filter ExerciseTest
php artisan test --filter WorkoutPlanTest
```

---

Parte de [TrackLife](../) · Stack: Laravel 13 · PHP 8.3 · MongoDB 7 · Sanctum
