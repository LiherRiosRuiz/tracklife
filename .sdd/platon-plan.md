The dataset is large but the WebFetch is truncating it. That is fine -- I have enough information to proceed. The key insight is that the dataset has 870+ exercises with `id`, `name`, `primaryMuscles`, `secondaryMuscles`, `instructions`, `images`, `equipment`, `category`. The images are JPGs, not GIFs. The image URL pattern is confirmed working: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/0.jpg`.

Now I have all the information to write the complete plan. Let me produce it.

---

# PLAN: Modulo Entrenamiento estilo Hevy para TRACKLIFE

## Contexto verificado (PREFLIGHT completado)

**Estado actual del codigo:**

- **Backend** (`projects/web/api-laravel/`): Laravel 13, MongoDB via `mongodb/laravel-mongodb@5.7`, conexion activa a MongoDB (no SQLite). Modelos `Exercise` y `Workout` existentes con campos basicos. Controladores con validacion inline (no FormRequests, no Resources). Rutas bajo `auth:sanctum`. Tests: solo `ExampleTest` que verifica `GET /` devuelve 200. `phpunit.xml` configura `DB_CONNECTION=sqlite` pero los modelos hardcodean `$connection = 'mongodb'`, asi que esos env vars son ignorados por los modelos Mongo.
- **Frontend** (`projects/web/web3-next/`): Next.js 16 + React 19 + Tailwind 4. Tema dark con accent verde `#22c55e`. Componentes UI: `Card`, `Button`, `PageHeader`, `MacroBar`, `ScoreBadge`. Auth via `useAuth()` + token Bearer. API client centralizado en `lib/api.ts`. Paginas de entrenamiento existentes: hub, gym (formulario ad-hoc), ejercicios (lista plana), cardio, progreso.
- **Dataset externo**: `yuhonas/free-exercise-db` en GitHub. 870+ ejercicios en JSON con campos `id`, `name`, `primaryMuscles`, `secondaryMuscles`, `instructions`, `equipment`, `category`, `images`. Imagenes son JPG (no GIF), URL base: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/0.jpg`. Confirmado que devuelve 200.

**Decisiones criticas tomadas:**

1. **Mongo en tests**: Los tests de backend requieren conexion real a MongoDB (no SQLite). Se configurara `MONGO_DATABASE=tracklife_testing` en `phpunit.xml` y un trait de limpieza por coleccion.
2. **Frontend sin test runner**: `ready: false`. Verificacion frontend = `npm run lint` + `npm run build` + prueba manual. Desviacion consciente del Strict TDD.
3. **Imagenes, no GIFs**: El campo se llamara `image_url` (no `gif_url`) porque el dataset son JPGs. Honestidad sobre el dato.
4. **Taxonomia muscular**: El dataset usa ingles (`chest`, `quadriceps`). Se mantiene ingles en BD y se mapea a espanol en frontend para mostrar al usuario.
5. **`POST /api/workouts/from-plan/{id}` NO persiste**: Devuelve un payload pre-poblado. El cliente lo mantiene en estado local y persiste al finalizar via `POST /api/workouts` existente. No se agrega campo `status`/`draft` al modelo Workout. Compatibilidad total con workouts existentes.
6. **Ejercicios existentes inline en `ExerciseController::index` se eliminan** una vez exista el seeder real.
7. **Convenciones existentes se mantienen**: Validacion inline (no FormRequests), no API Resources, misma estructura de respuesta `{ "key": data }`.

---

## Fase 0: Calibracion de MongoDB para tests

**Objetivo**: Confirmar que los tests de Laravel pueden conectar a MongoDB y operar en una BD de testing aislada.

### Paso 0.1: Configurar phpunit.xml para MongoDB testing

**Archivo**: `projects/web/api-laravel/phpunit.xml`

**Cambio**: Agregar/cambiar estas lineas en el bloque `<php>`:
```xml
<env name="DB_CONNECTION" value="mongodb"/>
<env name="MONGODB_URI" value="mongodb://127.0.0.1:27017/tracklife_testing"/>
<env name="MONGO_DATABASE" value="tracklife_testing"/>
```

Nota: `DB_CONNECTION=sqlite` y `DB_DATABASE=:memory:` se pueden dejar como fallback, pero los modelos con `$connection = 'mongodb'` los ignoraran. Lo importante es que `MONGODB_URI` apunte a la BD de testing.

### Paso 0.2: Crear trait MongoTestCleanup

**Archivo a crear**: `projects/web/api-laravel/tests/Traits/MongoTestCleanup.php`

```php
<?php

namespace Tests\Traits;

use Illuminate\Support\Facades\DB;

trait MongoTestCleanup
{
    protected function cleanMongoCollections(array $collections): void
    {
        $connection = DB::connection('mongodb');
        foreach ($collections as $collection) {
            $connection->getCollection($collection)->drop();
        }
    }

    protected function tearDown(): void
    {
        $this->cleanMongoCollections($this->mongoCollections ?? []);
        parent::tearDown();
    }
}
```

### Paso 0.3: Verificar conectividad

**Accion de Vinci**: Ejecutar dentro del contenedor `api-laravel`:
```bash
php artisan tinker --execute="DB::connection('mongodb')->getMongoClient()->listDatabases()"
```

Si falla, verificar que el contenedor MongoDB esta arrancado y accesible desde `api-laravel` via `backend_net`.

**Gate**: No se pasa al Paso 1 hasta que esta verificacion devuelva una lista de BDs sin error.

---

## Fase 1: Backend -- Ampliar modelo Exercise + Seeder

### Paso 1.1: TEST RED -- Exercise model tiene campos ampliados

**Archivo a crear**: `projects/web/api-laravel/tests/Feature/ExerciseTest.php`

```php
<?php

namespace Tests\Feature;

use App\Models\Exercise;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class ExerciseTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['exercises'];

    public function test_exercise_has_extended_fields(): void
    {
        $exercise = Exercise::create([
            'name' => 'Barbell Bench Press',
            'muscle_group' => 'chest',
            'equipment' => 'barbell',
            'category' => 'strength',
            'is_custom' => false,
            'instructions' => [
                'Lie on a flat bench with your feet on the floor.',
                'Grip the bar slightly wider than shoulder width.',
                'Lower the bar to your mid-chest.',
                'Press the bar back up to full arm extension.',
            ],
            'tips' => ['Keep your back flat on the bench.'],
            'image_url' => 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
            'muscles_primary' => ['chest'],
            'muscles_secondary' => ['shoulders', 'triceps'],
        ]);

        $found = Exercise::find($exercise->_id);

        $this->assertNotNull($found);
        $this->assertSame('Barbell Bench Press', $found->name);
        $this->assertSame('strength', $found->category);
        $this->assertIsArray($found->instructions);
        $this->assertCount(4, $found->instructions);
        $this->assertIsArray($found->muscles_primary);
        $this->assertContains('chest', $found->muscles_primary);
        $this->assertIsArray($found->muscles_secondary);
        $this->assertStringContainsString('raw.githubusercontent.com', $found->image_url);
    }

    public function test_exercise_index_filters_by_muscle_group(): void
    {
        Exercise::create(['name' => 'Bench Press', 'muscle_group' => 'chest', 'equipment' => 'barbell', 'is_custom' => false, 'category' => 'strength']);
        Exercise::create(['name' => 'Squat', 'muscle_group' => 'quadriceps', 'equipment' => 'barbell', 'is_custom' => false, 'category' => 'strength']);

        $response = $this->actingAsTestUser()
            ->getJson('/api/exercises?muscle_group=chest');

        $response->assertOk();
        $exercises = $response->json('exercises');
        $this->assertCount(1, $exercises);
        $this->assertSame('Bench Press', $exercises[0]['name']);
    }

    public function test_exercise_index_searches_by_name(): void
    {
        Exercise::create(['name' => 'Barbell Bench Press', 'muscle_group' => 'chest', 'equipment' => 'barbell', 'is_custom' => false, 'category' => 'strength']);
        Exercise::create(['name' => 'Dumbbell Fly', 'muscle_group' => 'chest', 'equipment' => 'dumbbell', 'is_custom' => false, 'category' => 'strength']);

        $response = $this->actingAsTestUser()
            ->getJson('/api/exercises?q=bench');

        $response->assertOk();
        $exercises = $response->json('exercises');
        $this->assertCount(1, $exercises);
    }

    public function test_exercise_show_returns_full_detail(): void
    {
        $exercise = Exercise::create([
            'name' => 'Deadlift',
            'muscle_group' => 'lower back',
            'equipment' => 'barbell',
            'is_custom' => false,
            'category' => 'strength',
            'instructions' => ['Stand with feet hip-width apart.', 'Grip the bar.', 'Lift by extending hips and knees.'],
            'image_url' => 'https://example.com/deadlift.jpg',
            'muscles_primary' => ['lower back'],
            'muscles_secondary' => ['glutes', 'hamstrings'],
        ]);

        $response = $this->actingAsTestUser()
            ->getJson("/api/exercises/{$exercise->_id}");

        $response->assertOk()
            ->assertJsonPath('exercise.name', 'Deadlift')
            ->assertJsonPath('exercise.category', 'strength');

        $this->assertIsArray($response->json('exercise.instructions'));
    }

    private function actingAsTestUser(): static
    {
        $user = \App\Models\User::create([
            'name' => 'Test User',
            'email' => 'test-' . uniqid() . '@test.com',
            'username' => 'testuser' . uniqid(),
            'password' => 'password123',
            'macro_targets' => \App\Models\User::defaultMacroTargets(),
            'privacy_settings' => \App\Models\User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        return $this->actingAs($user, 'sanctum');
    }
}
```

**Ejecutar**: `php artisan test tests/Feature/ExerciseTest.php` -- debe FALLAR (campos no existen en `$fillable`, rutas de filtro y show no existen).

### Paso 1.2: GREEN -- Ampliar modelo Exercise

**Archivo a modificar**: `projects/web/api-laravel/app/Models/Exercise.php`

Reemplazar contenido completo:

```php
<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Exercise extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'exercises';

    protected $fillable = [
        'name',
        'muscle_group',
        'equipment',
        'category',
        'is_custom',
        'user_id',
        'instructions',
        'tips',
        'image_url',
        'muscles_primary',
        'muscles_secondary',
        'force',
        'level',
        'mechanic',
        'external_id',
    ];

    protected function casts(): array
    {
        return [
            'is_custom' => 'boolean',
            'instructions' => 'array',
            'tips' => 'array',
            'muscles_primary' => 'array',
            'muscles_secondary' => 'array',
        ];
    }
}
```

### Paso 1.3: GREEN -- Ampliar ExerciseController con filtros y show

**Archivo a modificar**: `projects/web/api-laravel/app/Http/Controllers/Api/ExerciseController.php`

Reemplazar contenido completo:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExerciseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Exercise::where(function ($q) use ($request) {
            $q->where('is_custom', false)
                ->orWhere('user_id', (string) $request->user()->_id);
        });

        if ($request->filled('muscle_group')) {
            $query->where('muscle_group', $request->input('muscle_group'));
        }

        if ($request->filled('equipment')) {
            $query->where('equipment', $request->input('equipment'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where('name', 'regex', new \MongoDB\BSON\Regex($search, 'i'));
        }

        $exercises = $query->orderBy('name')->get();

        return response()->json(['exercises' => $exercises]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $exercise = Exercise::where('_id', $id)
            ->where(function ($q) use ($request) {
                $q->where('is_custom', false)
                    ->orWhere('user_id', (string) $request->user()->_id);
            })
            ->firstOrFail();

        return response()->json(['exercise' => $exercise]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'muscle_group' => 'nullable|string',
            'equipment' => 'nullable|string',
            'category' => 'nullable|string',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string',
            'tips' => 'nullable|array',
            'tips.*' => 'string',
        ]);

        $exercise = Exercise::create(array_merge($data, [
            'user_id' => (string) $request->user()->_id,
            'is_custom' => true,
        ]));

        return response()->json(['exercise' => $exercise], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $exercise = Exercise::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->where('is_custom', true)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'muscle_group' => 'nullable|string',
            'equipment' => 'nullable|string',
            'category' => 'nullable|string',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string',
            'tips' => 'nullable|array',
            'tips.*' => 'string',
        ]);

        $exercise->update($data);

        return response()->json(['exercise' => $exercise]);
    }
}
```

### Paso 1.4: GREEN -- Agregar rutas de exercise show y update

**Archivo a modificar**: `projects/web/api-laravel/routes/api.php`

Dentro del grupo `auth:sanctum`, reemplazar las lineas de exercises:

```php
    // Exercises
    Route::get('/exercises', [ExerciseController::class, 'index']);
    Route::post('/exercises', [ExerciseController::class, 'store']);
    Route::get('/exercises/{id}', [ExerciseController::class, 'show']);
    Route::put('/exercises/{id}', [ExerciseController::class, 'update']);
```

**Ejecutar**: `php artisan test tests/Feature/ExerciseTest.php` -- debe PASAR.

### Paso 1.5: Crear archivo de datos curados de ejercicios

**Archivo a crear**: `projects/web/api-laravel/database/data/exercises.json`

**Estrategia**: Descargar el JSON completo de `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json` y filtrar 60 ejercicios curados. No copiar a mano 60 entradas.

Vinci debe:
1. Descargar el archivo completo a `database/data/exercises-full.json` (temporal)
2. Crear un script PHP o comando artisan que filtre por una lista de IDs curados y genere `database/data/exercises.json`
3. Borrar el archivo temporal

**Lista de 60 IDs curados** (la seleccion cubre todos los grupos musculares y equipos principales):

```
# Pecho
Barbell_Bench_Press_-_Medium_Grip
Barbell_Incline_Bench_Press_-_Medium_Grip
Dumbbell_Bench_Press
Dumbbell_Flyes
Pushups
Chest_Dip
Decline_Dumbbell_Bench_Press

# Espalda
Barbell_Deadlift
Bent_Over_Barbell_Row
Bent_Over_Two-Dumbbell_Row
Pullups
Chin-Up
Wide-Grip_Lat_Pulldown
Seated_Cable_Rows
T-Bar_Row
One-Arm_Dumbbell_Row

# Hombros
Barbell_Shoulder_Press
Arnold_Dumbbell_Press
Side_Lateral_Raise
Front_Dumbbell_Raise
Face_Pull
Upright_Barbell_Row
Reverse_Flyes

# Biceps
Barbell_Curl
Alternate_Hammer_Curl
Alternate_Incline_Dumbbell_Curl
Preacher_Curl
Concentration_Curls
Cable_Hammer_Curls_-_Rope_Attachment

# Triceps
Triceps_Pushdown
Close-Grip_Barbell_Bench_Press
Lying_Triceps_Press
Bench_Dips
Dumbbell_One-Arm_Triceps_Extension
Triceps_Pushdown_-_Rope_Attachment

# Piernas (Quadriceps)
Barbell_Squat
Barbell_Full_Squat
Leg_Press
Leg_Extensions
Front_Barbell_Squat
Barbell_Lunge
Bodyweight_Squat
Barbell_Hack_Squat

# Piernas (Hamstrings/Glutes)
Romanian_Deadlift_With_Dumbbells
Barbell_Hip_Thrust
Lying_Leg_Curls
Stiff-Legged_Barbell_Deadlift
Glute_Bridge

# Abdominales
Crunches
Hanging_Leg_Raise
Plank
Ab_Roller
Cable_Crunch

# Trapecio
Barbell_Shrug
Dumbbell_Shrug

# Pantorrillas
Standing_Calf_Raises
Seated_Calf_Raise

# Antebrazos
Wrist_Curl
Reverse_Barbell_Curl
```

Nota para Vinci: Algunos IDs pueden no coincidir exactamente con el dataset. Tras descargar el JSON completo, buscar por nombre parcial si un ID exacto no existe y usar el ID real. El objetivo es 60 ejercicios que cubran todos los grupos. Si un ID no existe, sustituir por otro ejercicio del mismo grupo muscular.

**Mapeo de muscle_group (ingles en BD, espanol en frontend)**:

| primaryMuscles (dataset) | muscle_group (BD) | Label UI (frontend) |
|---|---|---|
| chest | chest | Pecho |
| shoulders | shoulders | Hombros |
| biceps | biceps | Biceps |
| triceps | triceps | Triceps |
| quadriceps | quadriceps | Cuadriceps |
| hamstrings | hamstrings | Isquiotibiales |
| glutes | glutes | Gluteos |
| lower back | lower_back | Espalda baja |
| middle back | middle_back | Espalda media |
| lats | lats | Dorsales |
| traps | traps | Trapecios |
| abdominals | abdominals | Abdominales |
| calves | calves | Pantorrillas |
| forearms | forearms | Antebrazos |

### Paso 1.6: Crear ExerciseSeeder

**Archivo a crear**: `projects/web/api-laravel/database/seeders/ExerciseSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\Exercise;
use Illuminate\Database\Seeder;

class ExerciseSeeder extends Seeder
{
    private const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

    public function run(): void
    {
        $path = database_path('data/exercises.json');

        if (! file_exists($path)) {
            $this->command->error('exercises.json not found at ' . $path);
            return;
        }

        $exercises = json_decode(file_get_contents($path), true);

        foreach ($exercises as $entry) {
            Exercise::updateOrCreate(
                ['external_id' => $entry['id']],
                [
                    'name' => $entry['name'],
                    'muscle_group' => $entry['primaryMuscles'][0] ?? 'other',
                    'equipment' => $entry['equipment'] ?? 'body only',
                    'category' => $entry['category'] ?? 'strength',
                    'is_custom' => false,
                    'instructions' => $entry['instructions'] ?? [],
                    'tips' => [],
                    'image_url' => isset($entry['images'][0])
                        ? self::IMAGE_BASE . $entry['images'][0]
                        : null,
                    'muscles_primary' => $entry['primaryMuscles'] ?? [],
                    'muscles_secondary' => $entry['secondaryMuscles'] ?? [],
                    'force' => $entry['force'] ?? null,
                    'level' => $entry['level'] ?? null,
                    'mechanic' => $entry['mechanic'] ?? null,
                    'external_id' => $entry['id'],
                ]
            );
        }

        $this->command->info('Seeded ' . count($exercises) . ' exercises.');
    }
}
```

### Paso 1.7: Registrar seeder en DatabaseSeeder

**Archivo a modificar**: `projects/web/api-laravel/database/seeders/DatabaseSeeder.php`

```php
public function run(): void
{
    $this->call(TracklifeSeeder::class);
    $this->call(ExerciseSeeder::class);
}
```

### Paso 1.8: Ejecutar seeder y verificar

```bash
php artisan db:seed --class=ExerciseSeeder
```

**Criterio de done para Fase 1**:
- `php artisan test tests/Feature/ExerciseTest.php` pasa todos los tests
- `Exercise::count()` devuelve 60 en tinker
- `GET /api/exercises?muscle_group=chest` devuelve solo ejercicios de pecho
- `GET /api/exercises?q=bench` devuelve resultados filtrados
- `GET /api/exercises/{id}` devuelve detalle completo con instructions e image_url
- `./vendor/bin/pint` sin errores

---

## Fase 2: Backend -- Modelo WorkoutPlan + CRUD

### Paso 2.1: TEST RED -- WorkoutPlan CRUD

**Archivo a crear**: `projects/web/api-laravel/tests/Feature/WorkoutPlanTest.php`

```php
<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\WorkoutPlan;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class WorkoutPlanTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['workout_plans', 'exercises', 'users', 'personal_access_tokens'];

    public function test_can_create_workout_plan(): void
    {
        $exercise = Exercise::create([
            'name' => 'Bench Press',
            'muscle_group' => 'chest',
            'equipment' => 'barbell',
            'is_custom' => false,
            'category' => 'strength',
        ]);

        $response = $this->actingAsTestUser()->postJson('/api/workout-plans', [
            'name' => 'Push Day',
            'description' => 'Chest, shoulders and triceps',
            'exercises' => [
                [
                    'exercise_id' => (string) $exercise->_id,
                    'exercise_name' => 'Bench Press',
                    'order' => 1,
                    'sets' => [
                        ['set_number' => 1, 'type' => 'normal', 'reps' => 10, 'weight' => 60, 'rest_seconds' => 90],
                        ['set_number' => 2, 'type' => 'normal', 'reps' => 10, 'weight' => 60, 'rest_seconds' => 90],
                        ['set_number' => 3, 'type' => 'normal', 'reps' => 8, 'weight' => 65, 'rest_seconds' => 120],
                    ],
                ],
            ],
        ]);

        $response->assertCreated();
        $this->assertSame('Push Day', $response->json('plan.name'));
        $this->assertCount(1, $response->json('plan.exercises'));
        $this->assertCount(3, $response->json('plan.exercises.0.sets'));
    }

    public function test_can_list_own_plans(): void
    {
        $user = $this->createTestUser();

        WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'Plan A',
            'exercises' => [],
        ]);
        WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'Plan B',
            'exercises' => [],
        ]);
        WorkoutPlan::create([
            'user_id' => 'other-user-id',
            'name' => 'Plan C',
            'exercises' => [],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/workout-plans');

        $response->assertOk();
        $this->assertCount(2, $response->json('plans'));
    }

    public function test_can_show_own_plan(): void
    {
        $user = $this->createTestUser();

        $plan = WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'My Plan',
            'exercises' => [],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/workout-plans/{$plan->_id}");

        $response->assertOk()
            ->assertJsonPath('plan.name', 'My Plan');
    }

    public function test_cannot_show_other_users_plan(): void
    {
        $plan = WorkoutPlan::create([
            'user_id' => 'other-user-id',
            'name' => 'Secret Plan',
            'exercises' => [],
        ]);

        $response = $this->actingAsTestUser()
            ->getJson("/api/workout-plans/{$plan->_id}");

        $response->assertNotFound();
    }

    public function test_can_update_own_plan(): void
    {
        $user = $this->createTestUser();

        $plan = WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'Old Name',
            'exercises' => [],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/workout-plans/{$plan->_id}", [
                'name' => 'New Name',
                'description' => 'Updated description',
            ]);

        $response->assertOk()
            ->assertJsonPath('plan.name', 'New Name');
    }

    public function test_can_delete_own_plan(): void
    {
        $user = $this->createTestUser();

        $plan = WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'To Delete',
            'exercises' => [],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/workout-plans/{$plan->_id}");

        $response->assertOk();
        $this->assertNull(WorkoutPlan::find($plan->_id));
    }

    public function test_from_plan_returns_prefilled_workout_without_persisting(): void
    {
        $user = $this->createTestUser();

        $exercise = Exercise::create([
            'name' => 'Squat',
            'muscle_group' => 'quadriceps',
            'equipment' => 'barbell',
            'is_custom' => false,
            'category' => 'strength',
        ]);

        $plan = WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'Leg Day',
            'exercises' => [
                [
                    'exercise_id' => (string) $exercise->_id,
                    'exercise_name' => 'Squat',
                    'order' => 1,
                    'sets' => [
                        ['set_number' => 1, 'type' => 'normal', 'reps' => 10, 'weight' => 80, 'rest_seconds' => 120],
                    ],
                ],
            ],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/workouts/from-plan/{$plan->_id}");

        $response->assertOk();
        $workout = $response->json('workout');
        $this->assertSame('Leg Day', $workout['name']);
        $this->assertCount(1, $workout['sets']);
        $this->assertSame('Squat', $workout['sets'][0]['exercise']);
        $this->assertSame(80, $workout['sets'][0]['weight']);
        $this->assertArrayHasKey('rest_seconds', $workout['sets'][0]);
        $this->assertFalse($workout['sets'][0]['completed']);

        // Verify nothing was persisted
        $this->assertSame(0, \App\Models\Workout::where('user_id', (string) $user->_id)->count());
    }

    private function createTestUser(): \App\Models\User
    {
        return \App\Models\User::create([
            'name' => 'Test User',
            'email' => 'test-' . uniqid() . '@test.com',
            'username' => 'testuser' . uniqid(),
            'password' => 'password123',
            'macro_targets' => \App\Models\User::defaultMacroTargets(),
            'privacy_settings' => \App\Models\User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);
    }

    private function actingAsTestUser(): static
    {
        return $this->actingAs($this->createTestUser(), 'sanctum');
    }
}
```

**Ejecutar**: `php artisan test tests/Feature/WorkoutPlanTest.php` -- debe FALLAR.

### Paso 2.2: GREEN -- Crear modelo WorkoutPlan

**Archivo a crear**: `projects/web/api-laravel/app/Models/WorkoutPlan.php`

```php
<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class WorkoutPlan extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'workout_plans';

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'days_per_week',
        'exercises',
        'is_public',
    ];

    protected function casts(): array
    {
        return [
            'exercises' => 'array',
            'days_per_week' => 'integer',
            'is_public' => 'boolean',
        ];
    }
}
```

### Paso 2.3: GREEN -- Crear WorkoutPlanController

**Archivo a crear**: `projects/web/api-laravel/app/Http/Controllers/Api/WorkoutPlanController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkoutPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkoutPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $plans = WorkoutPlan::where('user_id', (string) $request->user()->_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['plans' => $plans]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:500',
            'days_per_week' => 'nullable|integer|min:1|max:7',
            'exercises' => 'required|array',
            'exercises.*.exercise_id' => 'required|string',
            'exercises.*.exercise_name' => 'required|string',
            'exercises.*.order' => 'required|integer',
            'exercises.*.sets' => 'required|array|min:1',
            'exercises.*.sets.*.set_number' => 'required|integer',
            'exercises.*.sets.*.type' => 'nullable|string|in:normal,warmup,dropset,failure',
            'exercises.*.sets.*.reps' => 'nullable|integer',
            'exercises.*.sets.*.weight' => 'nullable|numeric',
            'exercises.*.sets.*.rest_seconds' => 'nullable|integer',
        ]);

        $plan = WorkoutPlan::create([
            'user_id' => (string) $request->user()->_id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'days_per_week' => $data['days_per_week'] ?? null,
            'exercises' => $data['exercises'],
            'is_public' => false,
        ]);

        return response()->json(['plan' => $plan], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        return response()->json(['plan' => $plan]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'description' => 'nullable|string|max:500',
            'days_per_week' => 'nullable|integer|min:1|max:7',
            'exercises' => 'sometimes|array',
            'exercises.*.exercise_id' => 'required_with:exercises|string',
            'exercises.*.exercise_name' => 'required_with:exercises|string',
            'exercises.*.order' => 'required_with:exercises|integer',
            'exercises.*.sets' => 'required_with:exercises|array|min:1',
            'exercises.*.sets.*.set_number' => 'required|integer',
            'exercises.*.sets.*.type' => 'nullable|string|in:normal,warmup,dropset,failure',
            'exercises.*.sets.*.reps' => 'nullable|integer',
            'exercises.*.sets.*.weight' => 'nullable|numeric',
            'exercises.*.sets.*.rest_seconds' => 'nullable|integer',
        ]);

        $plan->update($data);

        return response()->json(['plan' => $plan->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $plan->delete();

        return response()->json(['message' => 'Plan eliminado']);
    }
}
```

### Paso 2.4: GREEN -- Agregar endpoint from-plan en WorkoutController

**Archivo a modificar**: `projects/web/api-laravel/app/Http/Controllers/Api/WorkoutController.php`

Agregar este metodo al final de la clase (antes del `}`):

```php
    public function fromPlan(Request $request, string $planId): JsonResponse
    {
        $plan = \App\Models\WorkoutPlan::where('_id', $planId)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $sets = [];
        foreach ($plan->exercises as $planExercise) {
            foreach ($planExercise['sets'] as $planSet) {
                $sets[] = [
                    'exercise' => $planExercise['exercise_name'],
                    'exercise_id' => $planExercise['exercise_id'],
                    'set_number' => $planSet['set_number'],
                    'type' => $planSet['type'] ?? 'normal',
                    'weight' => $planSet['weight'] ?? 0,
                    'reps' => $planSet['reps'] ?? 0,
                    'rest_seconds' => $planSet['rest_seconds'] ?? 90,
                    'completed' => false,
                ];
            }
        }

        return response()->json([
            'workout' => [
                'name' => $plan->name,
                'plan_id' => (string) $plan->_id,
                'date' => now()->toDateString(),
                'sets' => $sets,
                'duration_minutes' => null,
            ],
        ]);
    }
```

### Paso 2.5: GREEN -- Agregar rutas de workout-plans y from-plan

**Archivo a modificar**: `projects/web/api-laravel/routes/api.php`

Agregar al inicio del archivo el import:
```php
use App\Http\Controllers\Api\WorkoutPlanController;
```

Dentro del grupo `auth:sanctum`, agregar (ANTES de las rutas de workouts existentes para evitar colision con `{id}`):

```php
    // Workout Plans
    Route::get('/workout-plans', [WorkoutPlanController::class, 'index']);
    Route::post('/workout-plans', [WorkoutPlanController::class, 'store']);
    Route::get('/workout-plans/{id}', [WorkoutPlanController::class, 'show']);
    Route::put('/workout-plans/{id}', [WorkoutPlanController::class, 'update']);
    Route::delete('/workout-plans/{id}', [WorkoutPlanController::class, 'destroy']);

    // Workout from plan (must be BEFORE /workouts/{id})
    Route::post('/workouts/from-plan/{planId}', [WorkoutController::class, 'fromPlan']);
```

**Ejecutar**: `php artisan test tests/Feature/WorkoutPlanTest.php` -- debe PASAR.

### Paso 2.6: REFACTOR -- Lint

```bash
./vendor/bin/pint
php artisan test
```

**Criterio de done para Fase 2**:
- Todos los tests de `ExerciseTest` y `WorkoutPlanTest` pasan
- `POST /api/workout-plans` crea plan correctamente
- `POST /api/workouts/from-plan/{id}` devuelve payload sin persistir
- `./vendor/bin/pint` limpio
- Rutas existentes de workouts siguen funcionando

---

## Fase 3: Frontend -- Biblioteca de ejercicios mejorada

### Paso 3.0: Ampliar tipos y API client

**Archivo a modificar**: `projects/web/web3-next/lib/api.ts`

Reemplazar el tipo `Exercise` existente (linea 289-292):

```ts
export type Exercise = {
  _id?: string;
  name: string;
  muscle_group?: string;
  equipment?: string;
  category?: string;
  instructions?: string[];
  tips?: string[];
  image_url?: string;
  muscles_primary?: string[];
  muscles_secondary?: string[];
  is_custom?: boolean;
  force?: string;
  level?: string;
};
```

Agregar nuevo tipo `WorkoutPlan` despues de `Exercise`:

```ts
export type PlanSet = {
  set_number: number;
  type: "normal" | "warmup" | "dropset" | "failure";
  reps: number;
  weight: number;
  rest_seconds: number;
};

export type PlanExercise = {
  exercise_id: string;
  exercise_name: string;
  order: number;
  sets: PlanSet[];
};

export type WorkoutPlan = {
  _id?: string;
  name: string;
  description?: string;
  days_per_week?: number;
  exercises: PlanExercise[];
  is_public?: boolean;
};

export type ActiveWorkoutSet = {
  exercise: string;
  exercise_id: string;
  set_number: number;
  type: string;
  weight: number;
  reps: number;
  rest_seconds: number;
  completed: boolean;
};

export type ActiveWorkout = {
  name: string;
  plan_id?: string;
  date: string;
  sets: ActiveWorkoutSet[];
  duration_minutes: number | null;
};
```

Agregar estos metodos al objeto `api` (despues de `exercises`):

```ts
  exerciseDetail: (token: string, id: string) =>
    request<{ exercise: Exercise }>(`/api/exercises/${id}`, {}, token),

  workoutPlans: (token: string) =>
    request<{ plans: WorkoutPlan[] }>("/api/workout-plans", {}, token),

  createWorkoutPlan: (token: string, data: Partial<WorkoutPlan>) =>
    request<{ plan: WorkoutPlan }>("/api/workout-plans", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  workoutPlan: (token: string, id: string) =>
    request<{ plan: WorkoutPlan }>(`/api/workout-plans/${id}`, {}, token),

  updateWorkoutPlan: (token: string, id: string, data: Partial<WorkoutPlan>) =>
    request<{ plan: WorkoutPlan }>(`/api/workout-plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, token),

  deleteWorkoutPlan: (token: string, id: string) =>
    request<{ message: string }>(`/api/workout-plans/${id}`, {
      method: "DELETE",
    }, token),

  workoutFromPlan: (token: string, planId: string) =>
    request<{ workout: ActiveWorkout }>(`/api/workouts/from-plan/${planId}`, {
      method: "POST",
    }, token),
```

### Paso 3.1: Constante de mapeo muscular

**Archivo a crear**: `projects/web/web3-next/lib/muscles.ts`

```ts
export const MUSCLE_GROUPS = [
  { value: "chest", label: "Pecho" },
  { value: "shoulders", label: "Hombros" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "quadriceps", label: "Cuadriceps" },
  { value: "hamstrings", label: "Isquiotibiales" },
  { value: "glutes", label: "Gluteos" },
  { value: "lower_back", label: "Espalda baja" },
  { value: "middle_back", label: "Espalda media" },
  { value: "lats", label: "Dorsales" },
  { value: "traps", label: "Trapecios" },
  { value: "abdominals", label: "Abdominales" },
  { value: "calves", label: "Pantorrillas" },
  { value: "forearms", label: "Antebrazos" },
] as const;

export type MuscleGroupValue = (typeof MUSCLE_GROUPS)[number]["value"];

export function muscleLabel(value: string): string {
  return MUSCLE_GROUPS.find((m) => m.value === value)?.label ?? value;
}

export const EQUIPMENT_TYPES = [
  { value: "barbell", label: "Barra" },
  { value: "dumbbell", label: "Mancuernas" },
  { value: "cable", label: "Polea" },
  { value: "machine", label: "Maquina" },
  { value: "body only", label: "Peso corporal" },
  { value: "kettlebells", label: "Kettlebell" },
  { value: "bands", label: "Bandas" },
  { value: "exercise ball", label: "Fitball" },
  { value: "other", label: "Otro" },
] as const;

export function equipmentLabel(value: string): string {
  return EQUIPMENT_TYPES.find((e) => e.value === value)?.label ?? value;
}
```

### Paso 3.2: Pagina de biblioteca de ejercicios mejorada

**Archivo a modificar**: `projects/web/web3-next/app/app/entrenamiento/gym/ejercicios/page.tsx`

Reemplazar contenido completo:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api, type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, muscleLabel, equipmentLabel } from "@/lib/muscles";
import Link from "next/link";

export default function EjerciciosPage() {
  const { token } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedMuscle) params.set("muscle_group", selectedMuscle);
    if (selectedEquipment) params.set("equipment", selectedEquipment);

    const query = params.toString();
    const path = query ? `?${query}` : "";

    // Build the fetch URL with query params
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://api.tracklife.test"}/api/exercises${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })
      .then((r) => r.json())
      .then((data) => setExercises(data.exercises ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, search, selectedMuscle, selectedEquipment]);

  return (
    <div>
      <PageHeader title="Biblioteca de ejercicios" subtitle={`${exercises.length} ejercicios`} />

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar ejercicio..."
        className="mb-4 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted"
      />

      {/* Muscle group filter */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedMuscle(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !selectedMuscle ? "bg-accent text-black" : "border border-border text-muted hover:border-accent"
          }`}
        >
          Todos
        </button>
        {MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg.value}
            onClick={() => setSelectedMuscle(selectedMuscle === mg.value ? null : mg.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedMuscle === mg.value ? "bg-accent text-black" : "border border-border text-muted hover:border-accent"
            }`}
          >
            {mg.label}
          </button>
        ))}
      </div>

      {/* Equipment filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedEquipment(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !selectedEquipment ? "bg-accent-dim text-accent" : "border border-border text-muted hover:border-accent"
          }`}
        >
          Todo equipo
        </button>
        {EQUIPMENT_TYPES.map((eq) => (
          <button
            key={eq.value}
            onClick={() => setSelectedEquipment(selectedEquipment === eq.value ? null : eq.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedEquipment === eq.value ? "bg-accent-dim text-accent" : "border border-border text-muted hover:border-accent"
            }`}
          >
            {eq.label}
          </button>
        ))}
      </div>

      {/* Exercise grid */}
      {loading ? (
        <p className="text-center text-muted">Cargando...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((e) => (
            <Link key={e._id} href={`/app/entrenamiento/gym/ejercicios/${e._id}`}>
              <Card className="cursor-pointer transition hover:border-accent">
                {e.image_url && (
                  <img
                    src={e.image_url}
                    alt={e.name}
                    className="mb-3 h-40 w-full rounded-xl bg-background object-contain"
                    loading="lazy"
                  />
                )}
                <h3 className="font-semibold">{e.name}</h3>
                <div className="mt-1 flex gap-2 text-xs text-muted">
                  <span>{muscleLabel(e.muscle_group ?? "")}</span>
                  {e.equipment && <span>· {equipmentLabel(e.equipment)}</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && exercises.length === 0 && (
        <p className="mt-8 text-center text-muted">No se encontraron ejercicios</p>
      )}
    </div>
  );
}
```

### Paso 3.3: Pagina de detalle de ejercicio

**Archivo a crear**: `projects/web/web3-next/app/app/entrenamiento/gym/ejercicios/[id]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import { muscleLabel, equipmentLabel } from "@/lib/muscles";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecondImage, setShowSecondImage] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api.exerciseDetail(token, id)
      .then((r) => setExercise(r.exercise))
      .catch(() => router.push("/app/entrenamiento/gym/ejercicios"))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  if (loading) return <p className="text-center text-muted py-12">Cargando...</p>;
  if (!exercise) return null;

  // Derive second image URL: replace /0.jpg with /1.jpg
  const secondImageUrl = exercise.image_url?.replace("/0.jpg", "/1.jpg");

  return (
    <div>
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        ← Volver
      </Button>

      <PageHeader title={exercise.name} />

      {/* Images - toggle between start/end position */}
      {exercise.image_url && (
        <Card className="mb-4">
          <div className="relative">
            <img
              src={showSecondImage && secondImageUrl ? secondImageUrl : exercise.image_url}
              alt={`${exercise.name} - ${showSecondImage ? "posicion final" : "posicion inicial"}`}
              className="mx-auto h-64 rounded-xl object-contain"
            />
            {secondImageUrl && (
              <button
                onClick={() => setShowSecondImage(!showSecondImage)}
                className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted hover:border-accent hover:text-accent transition"
              >
                {showSecondImage ? "Ver posicion inicial" : "Ver posicion final"}
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Info badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        {exercise.muscle_group && (
          <span className="rounded-full bg-accent-dim px-3 py-1 text-xs font-medium text-accent">
            {muscleLabel(exercise.muscle_group)}
          </span>
        )}
        {exercise.equipment && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            {equipmentLabel(exercise.equipment)}
          </span>
        )}
        {exercise.level && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            {exercise.level}
          </span>
        )}
        {exercise.force && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            {exercise.force}
          </span>
        )}
      </div>

      {/* Muscles targeted */}
      {(exercise.muscles_primary?.length ?? 0) > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">Musculos principales</h2>
          <div className="flex flex-wrap gap-2">
            {exercise.muscles_primary?.map((m) => (
              <span key={m} className="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent">
                {muscleLabel(m)}
              </span>
            ))}
          </div>
          {(exercise.muscles_secondary?.length ?? 0) > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-medium text-muted">Musculos secundarios</h3>
              <div className="flex flex-wrap gap-2">
                {exercise.muscles_secondary?.map((m) => (
                  <span key={m} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                    {muscleLabel(m)}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Instructions */}
      {(exercise.instructions?.length ?? 0) > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Instrucciones</h2>
          <ol className="space-y-3">
            {exercise.instructions?.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-dim text-xs font-bold text-accent">
                  {i + 1}
                </span>
                <span className="text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
```

**Criterio de done para Fase 3**:
- `npm run build` compila sin errores
- `npm run lint` pasa
- `/app/entrenamiento/gym/ejercicios` muestra grid con imagenes, filtros funcionan
- `/app/entrenamiento/gym/ejercicios/{id}` muestra detalle con imagenes e instrucciones

---

## Fase 4: Frontend -- Planes de entrenamiento (CRUD)

### Paso 4.1: Pagina de lista de planes

**Archivo a crear**: `projects/web/web3-next/app/app/entrenamiento/planes/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { api, type WorkoutPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import Link from "next/link";

export default function PlanesPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.workoutPlans(token)
      .then((r) => setPlans(r.plans))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const deletePlan = async (id: string) => {
    if (!token || !confirm("Eliminar este plan?")) return;
    await api.deleteWorkoutPlan(token, id);
    setPlans(plans.filter((p) => p._id !== id));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Mis planes" subtitle={`${plans.length} planes`} />
        <Button href="/app/entrenamiento/planes/nuevo">+ Crear plan</Button>
      </div>

      {loading ? (
        <p className="text-center text-muted">Cargando...</p>
      ) : plans.length === 0 ? (
        <Card className="text-center">
          <p className="text-muted">No tienes planes de entrenamiento.</p>
          <Button href="/app/entrenamiento/planes/nuevo" className="mt-4">Crear tu primer plan</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card key={plan._id} className="flex items-center justify-between">
              <Link href={`/app/entrenamiento/planes/${plan._id}`} className="flex-1">
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.description && <p className="mt-1 text-sm text-muted">{plan.description}</p>}
                <p className="mt-1 text-xs text-muted">
                  {plan.exercises.length} ejercicios ·{" "}
                  {plan.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} series
                </p>
              </Link>
              <button onClick={() => deletePlan(plan._id!)} className="ml-4 text-sm text-muted hover:text-red-400">
                Eliminar
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Paso 4.2: Pagina de crear/editar plan (la mas compleja de esta fase)

**Archivo a crear**: `projects/web/web3-next/app/app/entrenamiento/planes/nuevo/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Exercise, type PlanExercise, type PlanSet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";

function emptySet(num: number): PlanSet {
  return { set_number: num, type: "normal", reps: 10, weight: 0, rest_seconds: 90 };
}

export default function NuevoPlanPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const addExercise = (ex: Exercise) => {
    setExercises([
      ...exercises,
      {
        exercise_id: ex._id!,
        exercise_name: ex.name,
        order: exercises.length + 1,
        sets: [emptySet(1), emptySet(2), emptySet(3)],
      },
    ]);
    setShowPicker(false);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order: i + 1 })));
  };

  const addSet = (exIndex: number) => {
    const updated = [...exercises];
    const ex = updated[exIndex];
    ex.sets = [...ex.sets, emptySet(ex.sets.length + 1)];
    setExercises(updated);
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    const updated = [...exercises];
    updated[exIndex].sets = updated[exIndex].sets
      .filter((_, i) => i !== setIndex)
      .map((s, i) => ({ ...s, set_number: i + 1 }));
    setExercises(updated);
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof PlanSet, value: number | string) => {
    const updated = [...exercises];
    (updated[exIndex].sets[setIndex] as Record<string, unknown>)[field] = value;
    setExercises([...updated]);
  };

  const save = async () => {
    if (!token || !name || exercises.length === 0) return;
    setSaving(true);
    try {
      await api.createWorkoutPlan(token, { name, description: description || undefined, exercises });
      router.push("/app/entrenamiento/planes");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Crear plan" subtitle="Configura ejercicios, series y descansos" />

      <Card className="mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del plan (ej: Push Day)"
          className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion (opcional)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </Card>

      {/* Exercise list */}
      {exercises.map((ex, exIdx) => (
        <Card key={exIdx} className="mb-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{ex.exercise_name}</h3>
            <button onClick={() => removeExercise(exIdx)} className="text-xs text-muted hover:text-red-400">
              Quitar
            </button>
          </div>

          {/* Set table header */}
          <div className="mb-2 grid grid-cols-5 gap-2 text-xs font-medium text-muted">
            <span>Serie</span>
            <span>Tipo</span>
            <span>Kg</span>
            <span>Reps</span>
            <span>Desc.</span>
          </div>

          {/* Sets */}
          {ex.sets.map((set, setIdx) => (
            <div key={setIdx} className="mb-1 grid grid-cols-5 items-center gap-2">
              <span className="text-sm text-muted">{set.set_number}</span>
              <select
                value={set.type}
                onChange={(e) => updateSet(exIdx, setIdx, "type", e.target.value)}
                className="rounded-lg border border-border bg-background px-1 py-1 text-xs"
              >
                <option value="normal">Normal</option>
                <option value="warmup">Warm-up</option>
                <option value="dropset">Dropset</option>
                <option value="failure">Fallo</option>
              </select>
              <input
                type="number"
                value={set.weight}
                onChange={(e) => updateSet(exIdx, setIdx, "weight", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
              />
              <input
                type="number"
                value={set.reps}
                onChange={(e) => updateSet(exIdx, setIdx, "reps", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={set.rest_seconds}
                  onChange={(e) => updateSet(exIdx, setIdx, "rest_seconds", Number(e.target.value))}
                  className="w-14 rounded-lg border border-border bg-background px-1 py-1 text-sm"
                />
                <button onClick={() => removeSet(exIdx, setIdx)} className="text-muted hover:text-red-400">
                  x
                </button>
              </div>
            </div>
          ))}

          <button onClick={() => addSet(exIdx)} className="mt-2 text-xs text-accent hover:underline">
            + Agregar serie
          </button>
        </Card>
      ))}

      {/* Add exercise button */}
      <Button onClick={() => setShowPicker(true)} variant="secondary" className="mb-4 w-full">
        + Agregar ejercicio
      </Button>

      {/* Save */}
      <Button onClick={save} className="w-full" disabled={!name || exercises.length === 0 || saving}>
        {saving ? "Guardando..." : "Guardar plan"}
      </Button>

      {/* Exercise picker modal */}
      {showPicker && (
        <ExercisePickerModal
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
```

### Paso 4.3: Componente ExercisePickerModal

**Archivo a crear**: `projects/web/web3-next/components/ExercisePickerModal.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MUSCLE_GROUPS, muscleLabel } from "@/lib/muscles";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://api.tracklife.test";

export function ExercisePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedMuscle) params.set("muscle_group", selectedMuscle);

    fetch(`${API_URL}/api/exercises?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((data) => setExercises(data.exercises ?? []))
      .catch(console.error);
  }, [token, search, selectedMuscle]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-card sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Elegir ejercicio</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            Cerrar
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            autoFocus
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Muscle filter */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          <button
            onClick={() => setSelectedMuscle(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              !selectedMuscle ? "bg-accent text-black" : "border border-border text-muted"
            }`}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg.value}
              onClick={() => setSelectedMuscle(selectedMuscle === mg.value ? null : mg.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                selectedMuscle === mg.value ? "bg-accent text-black" : "border border-border text-muted"
              }`}
            >
              {mg.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
          {exercises.map((ex) => (
            <button
              key={ex._id}
              onClick={() => onSelect(ex)}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:border-accent transition"
            >
              {ex.image_url && (
                <img src={ex.image_url} alt="" className="h-12 w-12 rounded-lg bg-background object-contain" />
              )}
              <div>
                <p className="text-sm font-medium">{ex.name}</p>
                <p className="text-xs text-muted">{muscleLabel(ex.muscle_group ?? "")}</p>
              </div>
            </button>
          ))}
          {exercises.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No se encontraron ejercicios</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Paso 4.4: Pagina de detalle de plan (con boton iniciar workout)

**Archivo a crear**: `projects/web/web3-next/app/app/entrenamiento/planes/[id]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type WorkoutPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import { muscleLabel } from "@/lib/muscles";

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api.workoutPlan(token, id)
      .then((r) => setPlan(r.plan))
      .catch(() => router.push("/app/entrenamiento/planes"))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  const startWorkout = async () => {
    if (!token || !plan?._id) return;
    setStarting(true);
    try {
      const { workout } = await api.workoutFromPlan(token, plan._id);
      // Store the draft workout in sessionStorage and navigate to active page
      sessionStorage.setItem("tracklife_active_workout", JSON.stringify(workout));
      sessionStorage.setItem("tracklife_workout_start", Date.now().toString());
      router.push("/app/entrenamiento/gym/activo");
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <p className="py-12 text-center text-muted">Cargando...</p>;
  if (!plan) return null;

  const totalSets = plan.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div>
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        ← Volver
      </Button>

      <PageHeader title={plan.name} subtitle={plan.description ?? undefined} />

      <div className="mb-4 flex gap-3">
        <span className="rounded-full bg-accent-dim px-3 py-1 text-xs text-accent">
          {plan.exercises.length} ejercicios
        </span>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
          {totalSets} series
        </span>
      </div>

      {/* Exercise list */}
      {plan.exercises
        .sort((a, b) => a.order - b.order)
        .map((ex, i) => (
          <Card key={i} className="mb-3">
            <h3 className="font-semibold">{ex.exercise_name}</h3>
            <div className="mt-2 space-y-1">
              {ex.sets.map((set, si) => (
                <div key={si} className="flex gap-4 text-sm text-muted">
                  <span>Serie {set.set_number}</span>
                  <span>{set.weight}kg</span>
                  <span>{set.reps} reps</span>
                  <span>{set.rest_seconds}s descanso</span>
                  {set.type !== "normal" && (
                    <span className="rounded bg-accent-dim px-1.5 text-xs text-accent">{set.type}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}

      <Button onClick={startWorkout} className="mt-4 w-full text-lg py-3" disabled={starting}>
        {starting ? "Preparando..." : "Iniciar Workout"}
      </Button>
    </div>
  );
}
```

### Paso 4.5: Agregar enlace a Planes en el hub de entrenamiento

**Archivo a modificar**: `projects/web/web3-next/app/app/entrenamiento/page.tsx`

Agregar a la lista `links`, como segundo elemento (despues de Gym):

```ts
  { href: "/app/entrenamiento/planes", title: "Planes", desc: "Rutinas de entrenamiento" },
```

**Criterio de done para Fase 4**:
- `npm run build` compila sin errores
- `/app/entrenamiento/planes` muestra lista de planes o estado vacio
- `/app/entrenamiento/planes/nuevo` permite crear plan con ejercicios del picker
- `/app/entrenamiento/planes/{id}` muestra detalle y boton "Iniciar Workout"
- Al pulsar "Iniciar Workout", navega a `/app/entrenamiento/gym/activo`

---

## Fase 5: Frontend -- Pantalla de workout activo (la mas compleja)

Esta es la pantalla central de la experiencia Hevy. Gestiona estado complejo: un workout en curso con N ejercicios, cada uno con N sets, timers de descanso, y persistencia al finalizar.

### Paso 5.1: Pagina de workout activo

**Archivo a crear**: `projects/web/web3-next/app/app/entrenamiento/gym/activo/page.tsx`

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type ActiveWorkoutSet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import { RestTimer } from "@/components/RestTimer";

type ExerciseGroup = {
  exercise: string;
  exercise_id: string;
  sets: (ActiveWorkoutSet & { index: number })[];
};

export default function ActiveWorkoutPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [sets, setSets] = useState<ActiveWorkoutSet[]>([]);
  const [workoutName, setWorkoutName] = useState("");
  const [planId, setPlanId] = useState<string | undefined>();
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<{ seconds: number; active: boolean }>({
    seconds: 0,
    active: false,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load workout from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("tracklife_active_workout");
    const storedStart = sessionStorage.getItem("tracklife_workout_start");

    if (!stored) {
      router.push("/app/entrenamiento");
      return;
    }

    try {
      const workout = JSON.parse(stored);
      setSets(workout.sets);
      setWorkoutName(workout.name);
      setPlanId(workout.plan_id);
      setStartTime(storedStart ? Number(storedStart) : Date.now());
      setLoaded(true);
    } catch {
      router.push("/app/entrenamiento");
    }
  }, [router]);

  // Elapsed time counter
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [loaded, startTime]);

  // Persist workout state to sessionStorage on changes
  useEffect(() => {
    if (!loaded || sets.length === 0) return;
    sessionStorage.setItem(
      "tracklife_active_workout",
      JSON.stringify({ name: workoutName, plan_id: planId, sets, date: new Date().toISOString().slice(0, 10) })
    );
  }, [sets, workoutName, planId, loaded]);

  // Group sets by exercise
  const exerciseGroups: ExerciseGroup[] = [];
  sets.forEach((set, index) => {
    const existing = exerciseGroups.find((g) => g.exercise_id === set.exercise_id);
    if (existing) {
      existing.sets.push({ ...set, index });
    } else {
      exerciseGroups.push({
        exercise: set.exercise,
        exercise_id: set.exercise_id,
        sets: [{ ...set, index }],
      });
    }
  });

  const toggleSet = useCallback(
    (setIndex: number) => {
      setSets((prev) => {
        const updated = [...prev];
        const set = updated[setIndex];
        const wasCompleted = set.completed;
        updated[setIndex] = { ...set, completed: !wasCompleted };

        // Start rest timer when completing a set (not when uncompleting)
        if (!wasCompleted && set.rest_seconds > 0) {
          setRestTimer({ seconds: set.rest_seconds, active: true });
        }

        return updated;
      });
    },
    []
  );

  const updateSetField = (setIndex: number, field: "weight" | "reps", value: number) => {
    setSets((prev) => {
      const updated = [...prev];
      updated[setIndex] = { ...updated[setIndex], [field]: value };
      return updated;
    });
  };

  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const finishWorkout = async () => {
    if (!token) return;
    setSaving(true);

    const completedSetData = sets
      .filter((s) => s.completed)
      .map((s, i) => ({
        exercise: s.exercise,
        exercise_id: s.exercise_id,
        set_number: i + 1,
        weight: s.weight,
        reps: s.reps,
        type: s.type,
      }));

    const durationMinutes = Math.round(elapsed / 60);

    try {
      await api.createWorkout(token, {
        name: workoutName,
        sets: completedSetData,
        duration_minutes: durationMinutes,
        shared_to_feed: true,
      });

      sessionStorage.removeItem("tracklife_active_workout");
      sessionStorage.removeItem("tracklife_workout_start");
      router.push("/app/entrenamiento/progreso");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const cancelWorkout = () => {
    if (!confirm("Cancelar el workout? Se perderan los datos.")) return;
    sessionStorage.removeItem("tracklife_active_workout");
    sessionStorage.removeItem("tracklife_workout_start");
    router.push("/app/entrenamiento");
  };

  if (!loaded) return <p className="py-12 text-center text-muted">Cargando...</p>;

  return (
    <div className="pb-24">
      {/* Header with timer and progress */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{workoutName}</h1>
          <p className="text-sm text-muted">{formatTime(elapsed)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-accent">{progressPct}%</p>
          <p className="text-xs text-muted">
            {completedSets}/{totalSets} series
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Rest timer overlay */}
      {restTimer.active && (
        <RestTimer
          seconds={restTimer.seconds}
          onFinish={() => setRestTimer({ seconds: 0, active: false })}
          onSkip={() => setRestTimer({ seconds: 0, active: false })}
        />
      )}

      {/* Exercise groups */}
      {exerciseGroups.map((group) => (
        <Card key={group.exercise_id} className="mb-4">
          <h3 className="mb-3 font-semibold">{group.exercise}</h3>

          {/* Set header */}
          <div className="mb-2 grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs font-medium text-muted">
            <span>#</span>
            <span>Kg</span>
            <span>Reps</span>
            <span></span>
          </div>

          {/* Sets */}
          {group.sets.map((set) => (
            <div
              key={set.index}
              className={`mb-1 grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 rounded-lg p-1 transition ${
                set.completed ? "bg-accent/10" : ""
              }`}
            >
              <span className={`text-sm ${set.completed ? "text-accent" : "text-muted"}`}>
                {set.set_number}
              </span>
              <input
                type="number"
                value={set.weight}
                onChange={(e) => updateSetField(set.index, "weight", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                disabled={set.completed}
              />
              <input
                type="number"
                value={set.reps}
                onChange={(e) => updateSetField(set.index, "reps", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                disabled={set.completed}
              />
              <button
                onClick={() => toggleSet(set.index)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  set.completed
                    ? "border-accent bg-accent text-black"
                    : "border-border text-muted hover:border-accent"
                }`}
              >
                {set.completed ? "✓" : ""}
              </button>
            </div>
          ))}
        </Card>
      ))}

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 md:ml-56">
        <div className="mx-auto flex max-w-5xl gap-3">
          <Button onClick={cancelWorkout} variant="ghost" className="flex-1">
            Cancelar
          </Button>
          <Button onClick={finishWorkout} className="flex-1" disabled={completedSets === 0 || saving}>
            {saving ? "Guardando..." : `Finalizar (${completedSets} series)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Paso 5.2: Componente RestTimer

**Archivo a crear**: `projects/web/web3-next/components/RestTimer.tsx`

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";

export function RestTimer({
  seconds: initialSeconds,
  onFinish,
  onSkip,
}: {
  seconds: number;
  onFinish: () => void;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      // Vibrate if supported
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      onFinish();
      return;
    }

    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onFinish]);

  const pct = initialSeconds > 0 ? (remaining / initialSeconds) * 100 : 0;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;

  // Add/subtract time
  const adjustTime = useCallback((delta: number) => {
    setRemaining((r) => Math.max(0, r + delta));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center">
        <p className="mb-2 text-sm font-medium text-muted">Descanso</p>

        {/* Circular progress */}
        <div className="relative mx-auto mb-6 h-48 w-48">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold tabular-nums">
              {minutes}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Time adjust buttons */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={() => adjustTime(-15)}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:border-accent"
          >
            -15s
          </button>
          <button
            onClick={() => adjustTime(15)}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:border-accent"
          >
            +15s
          </button>
          <button
            onClick={() => adjustTime(30)}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:border-accent"
          >
            +30s
          </button>
        </div>

        <button
          onClick={onSkip}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-black transition hover:bg-green-400"
        >
          Saltar descanso
        </button>
      </div>
    </div>
  );
}
```

### Paso 5.3: Permitir inicio de workout ad-hoc (sin plan)

**Archivo a modificar**: `projects/web/web3-next/app/app/entrenamiento/gym/page.tsx`

Reemplazar contenido completo. El nuevo flujo permite tanto workout ad-hoc como desde plan:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type ActiveWorkoutSet, type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";

function emptySet(exercise: string, exerciseId: string, num: number): ActiveWorkoutSet {
  return {
    exercise,
    exercise_id: exerciseId,
    set_number: num,
    type: "normal",
    weight: 0,
    reps: 10,
    rest_seconds: 90,
    completed: false,
  };
}

export default function GymPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("Sesion de fuerza");
  const [sets, setSets] = useState<ActiveWorkoutSet[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const addExercise = (ex: Exercise) => {
    const newSets: ActiveWorkoutSet[] = [1, 2, 3].map((n) =>
      emptySet(ex.name, ex._id!, n)
    );
    setSets([...sets, ...newSets]);
    setShowPicker(false);
  };

  const startWorkout = () => {
    if (sets.length === 0) return;

    const workout = {
      name,
      date: new Date().toISOString().slice(0, 10),
      sets,
      duration_minutes: null,
    };

    sessionStorage.setItem("tracklife_active_workout", JSON.stringify(workout));
    sessionStorage.setItem("tracklife_workout_start", Date.now().toString());
    router.push("/app/entrenamiento/gym/activo");
  };

  // Group sets by exercise for display
  const exerciseNames = [...new Set(sets.map((s) => s.exercise))];

  return (
    <div>
      <PageHeader title="Nuevo workout" subtitle="Elige ejercicios y empieza" />

      <Card className="mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del workout"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </Card>

      {exerciseNames.map((exName) => {
        const exSets = sets.filter((s) => s.exercise === exName);
        return (
          <Card key={exName} className="mb-3">
            <h3 className="mb-2 font-semibold">{exName}</h3>
            <p className="text-sm text-muted">{exSets.length} series configuradas</p>
          </Card>
        );
      })}

      <Button onClick={() => setShowPicker(true)} variant="secondary" className="mb-4 w-full">
        + Agregar ejercicio
      </Button>

      {sets.length > 0 && (
        <Button onClick={startWorkout} className="w-full">
          Iniciar Workout ({sets.length} series)
        </Button>
      )}

      {showPicker && (
        <ExercisePickerModal onSelect={addExercise} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
```

**Criterio de done para Fase 5**:
- `npm run build` compila sin errores
- `/app/entrenamiento/gym/activo` muestra workout con ejercicios agrupados, inputs de peso/reps editables
- Al marcar un set completado (checkmark), arranca el RestTimer automaticamente
- El RestTimer muestra countdown circular con opciones de +15s/-15s/Skip
- Al finalizar, se persiste via `POST /api/workouts` y navega a progreso
- El workout se mantiene en sessionStorage (resistente a refresh)
- El boton cancelar limpia sessionStorage y vuelve al hub

---

## Resumen de archivos

### Backend (api-laravel) -- Crear:
1. `tests/Traits/MongoTestCleanup.php`
2. `tests/Feature/ExerciseTest.php`
3. `tests/Feature/WorkoutPlanTest.php`
4. `app/Models/WorkoutPlan.php`
5. `app/Http/Controllers/Api/WorkoutPlanController.php`
6. `database/data/exercises.json` (60 ejercicios curados del dataset libre)
7. `database/seeders/ExerciseSeeder.php`

### Backend (api-laravel) -- Modificar:
1. `phpunit.xml` -- agregar env vars de MongoDB testing
2. `app/Models/Exercise.php` -- ampliar fillable y casts
3. `app/Http/Controllers/Api/ExerciseController.php` -- agregar filtros, show, update; eliminar seed inline
4. `app/Http/Controllers/Api/WorkoutController.php` -- agregar metodo fromPlan
5. `routes/api.php` -- agregar rutas de exercises show/update, workout-plans CRUD, from-plan
6. `database/seeders/DatabaseSeeder.php` -- registrar ExerciseSeeder

### Frontend (web3-next) -- Crear:
1. `lib/muscles.ts`
2. `components/ExercisePickerModal.tsx`
3. `components/RestTimer.tsx`
4. `app/app/entrenamiento/gym/ejercicios/[id]/page.tsx`
5. `app/app/entrenamiento/planes/page.tsx`
6. `app/app/entrenamiento/planes/nuevo/page.tsx`
7. `app/app/entrenamiento/planes/[id]/page.tsx`
8. `app/app/entrenamiento/gym/activo/page.tsx`

### Frontend (web3-next) -- Modificar:
1. `lib/api.ts` -- ampliar tipos Exercise, agregar tipos WorkoutPlan/ActiveWorkout, agregar metodos API
2. `app/app/entrenamiento/page.tsx` -- agregar enlace a Planes
3. `app/app/entrenamiento/gym/page.tsx` -- reemplazar por nuevo flujo ad-hoc con picker
4. `app/app/entrenamiento/gym/ejercicios/page.tsx` -- reemplazar por version con filtros e imagenes

---

## Orden de ejecucion y dependencias

```
Fase 0 (Calibracion Mongo)
  |
  v
Fase 1 (Exercise model + seeder)   -- requiere Fase 0
  |
  v
Fase 2 (WorkoutPlan CRUD)          -- requiere Fase 1
  |
  v
Fase 3 (Frontend biblioteca)       -- requiere Fase 1 (API de exercises ampliada)
  |
  v
Fase 4 (Frontend planes)           -- requiere Fase 2 (API de plans) + Fase 3 (picker)
  |
  v
Fase 5 (Frontend workout activo)   -- requiere Fase 4 (sessionStorage flow)
```

## Criterio global de "done"

1. `php artisan test` pasa todos los tests (ExerciseTest + WorkoutPlanTest + tests existentes)
2. `./vendor/bin/pint` limpio
3. `npm run build` compila sin errores en web3-next
4. `npm run lint` pasa en web3-next
5. 60 ejercicios en MongoDB con imagenes e instrucciones
6. Flujo completo funcional: crear plan -> iniciar workout -> completar sets con timer -> guardar -> ver en progreso
7. Workouts existentes (creados antes de este cambio) siguen visibles en `/app/entrenamiento/progreso`agentId: af3f3763c41376f4f (use SendMessage with to: 'af3f3763c41376f4f' to continue this agent)
<usage>subagent_tokens: 91328
tool_uses: 45
duration_ms: 625451</usage>