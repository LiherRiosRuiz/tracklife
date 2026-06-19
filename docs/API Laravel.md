# API Laravel — TRACKLIFE API

Backend REST de TRACKLIFE. Laravel 13 + PHP 8.3. MongoDB como base de datos.

- **Dominio**: `http://api.tracklife.test`
- **Puerto interno**: 8000
- **Contenedor**: `api-laravel`
- **Ruta**: `projects/web/api-laravel/`

---

## Stack técnico

| Componente | Versión |
|-----------|---------|
| PHP | 8.3 |
| Laravel | 13.8 |
| Laravel Sanctum | 4.0 |
| mongodb/laravel-mongodb | 5.7 |
| PHPUnit | 12.5.12 |
| Laravel Pint | 1.27 |
| Faker | 1.23 |
| Mockery | 1.6 |

**Base de datos**: MongoDB 7 (conexión `mongodb`). Todos los modelos usan `MongoDB\Laravel\Eloquent\Model` o `MongoDB\Laravel\Auth\User`.

---

## Endpoints

### Públicos (sin autenticación)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check: `{"status":"ok","app":"TRACKLIFE API"}` |
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login, devuelve Sanctum token |
| GET | `/api/feed` | Feed público |
| GET | `/api/challenges` | Lista de retos activos |
| GET | `/api/challenges/{id}` | Detalle de reto |
| GET | `/api/clubs` | Lista de clubs |
| GET | `/api/clubs/{id}` | Detalle de club |
| GET | `/api/users/{id}/profile` | Perfil público de usuario |
| GET | `/api/products/barcode/{barcode}` | Producto por código de barras (OpenFoodFacts) |
| GET | `/api/products/{id}` | Producto por ID |

### Autenticados (`Authorization: Bearer <token>`)

#### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/me` | Usuario autenticado |
| POST | `/api/auth/logout` | Revocar token actual |

#### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | Resumen del día: macros + insights + feed_preview |

#### Nutrición
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/meals` | Comidas del usuario (filtrables por `?date=YYYY-MM-DD`) |
| POST | `/api/meals` | Registrar comida |
| PUT | `/api/meals/{id}` | Actualizar comida |
| DELETE | `/api/meals/{id}` | Eliminar comida |
| GET | `/api/foods/search` | Buscar alimentos en OpenFoodFacts (`?q=nombre`) |
| POST | `/api/products/scan` | Escanear código de barras + calcular health score |
| GET | `/api/macros/targets` | Objetivos de macros del usuario |
| PUT | `/api/macros/targets` | Actualizar objetivos de macros |
| GET | `/api/macros/progress` | Progreso del día (`?date=YYYY-MM-DD`) |
| GET | `/api/recipes` | Recetas del usuario |
| POST | `/api/recipes` | Crear receta |
| GET | `/api/recipes/{id}` | Detalle de receta |

#### Entrenamiento
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/workouts` | Últimos 30 workouts del usuario |
| POST | `/api/workouts` | Registrar sesión gym (calcula volumen automático) |
| GET | `/api/workouts/{id}` | Detalle de workout |
| GET | `/api/exercises` | Catálogo de ejercicios del usuario |
| POST | `/api/exercises` | Añadir ejercicio |
| GET | `/api/activities` | Actividades cardio del usuario |
| POST | `/api/activities` | Registrar actividad cardio |
| GET | `/api/activities/{id}` | Detalle de actividad |

#### Biométricos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/biometrics` | Lecturas (`?type=sleep_score&days=7`) |
| POST | `/api/biometrics` | Registrar lectura biométrica |
| GET | `/api/biometrics/today` | Resumen de hoy (5 tipos clave) |

#### Social
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/feed` | Publicar en el feed |
| POST | `/api/feed/{id}/kudos` | Dar kudos a un post |
| POST | `/api/feed/{id}/comments` | Comentar un post |
| POST | `/api/challenges/{id}/join` | Unirse a reto |
| POST | `/api/clubs` | Crear club |
| POST | `/api/clubs/{id}/join` | Unirse a club |

#### Perfil y Coach
| Método | Ruta | Descripción |
|--------|------|-------------|
| PUT | `/api/profile` | Actualizar perfil del usuario |
| GET | `/api/coach/daily` | Insights diarios automáticos |

#### Wearables
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/wearables` | Conexiones de wearables del usuario |
| POST | `/api/wearables/connect` | Conectar wearable (`{provider}`) |
| POST | `/api/wearables/{provider}/sync` | Sincronizar datos de wearable |

---

## Modelos (todos en MongoDB)

### User
`app/Models/User.php` — extiende `MongoDB\Laravel\Auth\User`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre completo |
| `username` | string | Handle único (generado desde email si vacío) |
| `email` | string | Email único |
| `password` | hashed | Hash bcrypt |
| `bio` | string | Biografía |
| `avatar_url` | string | URL de avatar |
| `transformation_goal` | array | Objetivo de transformación |
| `macro_targets` | array | `{calories, protein, carbs, fat}` |
| `privacy_settings` | array | Visibilidad de cada módulo |
| `streak_days` | integer | Días consecutivos de registro |
| `last_meal_log_date` | date | Fecha del último registro de comida |

**Defaults:**
- `macro_targets`: `{calories:2200, protein:150, carbs:220, fat:70}`
- `privacy_settings`: `{meals:followers, product_scans:public, progress_photos:private, biometrics:private, workouts:followers}`

### MealEntry
`app/Models/MealEntry.php`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | string | ID del usuario |
| `date` | date | Fecha de la comida |
| `meal_type` | string | desayuno/almuerzo/cena/snack |
| `items` | array | `[{name, quantity, unit, calories, protein, carbs, fat, barcode}]` |
| `totals` | array | `{calories, protein, carbs, fat}` sumados |
| `photo_url` | string | URL de foto |
| `notes` | string | Notas |
| `shared_to_feed` | boolean | Si se publicó en el feed |

### Workout
`app/Models/Workout.php`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | string | ID del usuario |
| `name` | string | Nombre de la sesión |
| `date` | date | Fecha |
| `sets` | array | `[{exercise, weight, reps}]` |
| `total_volume` | float | Kg totales (peso × reps de todos los sets) — calculado automáticamente |
| `duration_minutes` | integer | Duración |
| `notes` | string | Notas |
| `shared_to_feed` | boolean | Si se publicó |

### BiometricReading
`app/Models/BiometricReading.php`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | string | ID del usuario |
| `type` | enum | sleep_score, hrv, resting_hr, recovery_score, strain, steps, weight, body_fat, spO2 |
| `value` | float | Valor numérico |
| `unit` | string | Unidad (bpm, ms, kg, %, etc.) |
| `timestamp` | datetime | Momento de la lectura |
| `source` | string | manual / zepp / whoop / etc. |
| `metadata` | array | Datos extra específicos del tipo |

### SocialPost
`app/Models/SocialPost.php`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | string | Autor |
| `type` | string | workout_completed / activity_completed / recovery_milestone |
| `payload` | array | Datos específicos del tipo |
| `kudos_count` | integer | Total de kudos |
| `kudos_user_ids` | array | IDs de usuarios que dieron kudos |
| `comments` | array | `[{user_name, text, created_at}]` |

### Otros modelos
| Modelo | Colección | Descripción |
|--------|-----------|-------------|
| `Activity` | `activities` | Actividades cardio: type, title, distance_km, duration_minutes |
| `Exercise` | `exercises` | Ejercicios: name, muscle_group |
| `Challenge` | `challenges` | Retos: title, type, participant_ids, leaderboard, is_active |
| `Club` | `clubs` | Clubs: name, description, owner_id, member_ids, is_public |
| `Product` | `products` | Productos escaneados: barcode, name, brand, nutriments, health_score, nova_group |
| `Recipe` | `recipes` | Recetas: title, description, ingredients, totals_per_serving |
| `WearableConnection` | `wearable_connections` | provider, status, last_sync_at |
| `PersonalAccessToken` | `personal_access_tokens` | Sanctum (colección MongoDB) — ver nota de fix de autenticación abajo |

---

### PersonalAccessToken — fix de autenticación con MongoDB (2026-06-13)

**Síntoma**: `GET /api/auth/me` con Bearer token válido devolvía `{"message":"Unauthenticated."}`.

**Causa raíz**: Sanctum 4.x divide el Bearer token en `id|hash`. El Guard valida el segmento `id` con `ctype_digit()` — espera un entero (ID autoincremental de SQL). MongoDB usa ObjectId hexadecimales (24 chars). El modelo `PersonalAccessToken` heredaba `$keyType = 'int'` de la clase base de Sanctum. Al no pasar `ctype_digit($id)`, el token se descartaba antes de llegar a `findToken()`.

**Fix** — `app/Models/PersonalAccessToken.php`:

```php
protected $keyType = 'string';  // ObjectId MongoDB no es entero SQL
```

El modelo ahora declara explícitamente `$connection`, `$collection`, `$primaryKey` y `$keyType`:

```php
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use DocumentModel;

    protected $connection = 'mongodb';
    protected $collection = 'personal_access_tokens';
    protected $primaryKey = '_id';
    protected $keyType = 'string';
}
```

**Estado post-fix**: auth funcional end-to-end. `GET /api/auth/me` y `GET /api/dashboard` retornan 200 con datos reales cuando el Bearer token es válido.

---

## Servicios

### CoachService
`app/Services/CoachService.php`

Genera insights diarios analizando el estado del usuario. Se llama desde:
- `DashboardController::index()` — parte del resumen del dashboard
- `CoachController::daily()` — endpoint dedicado

**Reglas de negocio:**
1. Si proteína consumida hoy < 60% del objetivo → warning "Te faltan ~Xg de proteína"
2. Si último workout > 3 días → info "Llevas 3+ días sin entrenar"
3. Si última actividad cardio > 5 días → info "Considera actividad cardio"
4. Si último `recovery_score` < 50 → warning "Recuperación baja"
5. Si no hay alertas → success "Buen ritmo"

### FeedService
`app/Services/FeedService.php`

Crea y formatea posts del feed social.

- `createPost(User, type, payload)` → crea SocialPost con kudos/comments vacíos
- `formatPost(SocialPost)` → enriquece el post con datos del usuario (name, username, avatar_url)

Lo llaman: WorkoutController (al `shared_to_feed=true`), BiometricController (recovery_score ≥ 80).

### HealthScoreService
`app/Services/HealthScoreService.php`

Calcula un score de salud 0-100 para un producto alimenticio.

**Algoritmo** (base 70):
| Condición | Ajuste |
|-----------|--------|
| Azúcares > 15g/100g | -15 |
| Azúcares 8-15g/100g | -8 |
| Sal > 1.5g/100g | -12 |
| Grasas saturadas > 5g/100g | -10 |
| Fibra ≥ 3g/100g | +8 |
| Proteína ≥ 10g/100g | +5 |
| NOVA 4 (ultraprocesado) | -20 |
| NOVA 3 (procesado) | -10 |
| Edulcorantes en ingredientes | -5 |

Resultado: `{health_score: 0-100, alerts: [string[]]}`

### OpenFoodFactsService
`app/Services/OpenFoodFactsService.php`

Integración con la API de Open Food Facts.

- `fetchByBarcode(barcode)` → GET `api.v2/product/{barcode}.json`
  - Devuelve: barcode, name, brand, image_url, nutriments, ingredients, nova_group, source
- `searchFoods(query)` → GET búsqueda, hasta 15 resultados con campos mínimos

### StreakService
`app/Services/StreakService.php`

Mantiene el contador de días consecutivos de registro de comidas:
- Mismo día: no actualiza
- Día siguiente: `streak_days += 1`
- Brecha > 1 día: `streak_days = 1`

---

## Seeds

`database/seeders/TracklifeSeeder.php` — se ejecuta automáticamente al iniciar el contenedor.

Crea (si no existen):
- Challenge: "7 días registrando comida" (tipo nutrition, activo 30 días)
- Challenge: "30 días sin ultraprocesados" (tipo nutrition, activo 30 días)
- Club: "TRACKLIFE Transformación" (club principal, público)

---

## Docker

**Dockerfile**: PHP 8.3-cli + Composer. Auto-scaffold de Laravel si no existe `artisan`.

**`docker-entrypoint.sh`**:
1. Si no hay `artisan`: scaffold Laravel en `/tmp` + copia a `/app`
2. Si `vendor` vacío: `composer install`
3. `php artisan key:generate`
4. `php artisan db:seed` (TracklifeSeeder)
5. `php artisan serve --host=0.0.0.0 --port=8000`

**Variables de entorno (docker-compose.yml)**:
```
DB_CONNECTION=mongodb
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_DATABASE=tracklife
MONGODB_URI=mongodb://admin:pass@mongodb:27017/tracklife?authSource=admin
APP_NAME=TRACKLIFE
```

**Redes**: `traefik_net` (HTTP) + `backend_net` (MongoDB)

**CORS** (vía labels Traefik):
- Origins: `http://app.tracklife.test`, `http://tracklife.test`, `http://www.tracklife.test`
- Métodos: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization

**Volumen**: `api_vendor` (anónimo) para `vendor/` en ext4 WSL2

---

## Tests y linting

```bash
php artisan test                    # Suite completa
php artisan test tests/Unit         # Solo unitarios
php artisan test tests/Feature      # Solo features
php artisan test --parallel         # Paralelo
./vendor/bin/pint                   # Formatear código
./vendor/bin/pint --test            # Solo verificar formato
```

Config tests: `phpunit.xml` — SQLite in-memory, PULSE/TELESCOPE/NIGHTWATCH deshabilitados.

Estado actual: 2 tests stub (ExampleTest en Unit y Feature). Sin tests reales todavía.

---

Ver también: [[TRACKLIFE]], [[MongoDB]], [[Arquitectura Docker]]
