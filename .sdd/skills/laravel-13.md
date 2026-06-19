---
skill: laravel-13
version: "13.x"
projects: [api-laravel]
triggers: [laravel, php, artisan, eloquent, controller, migration, request, policy, pest, phpunit]
---

# Laravel 13 — Patrones del stack LIHER

## Stack
- Laravel 13.8 + PHP 8.3
- Tests: PHPUnit 12 (disponible) / Pest (transitive dep)
- DB activa: SQLite (tests), MongoDB pendiente de cablear
- Lint: Laravel Pint
- Auth: pendiente de decisión

## Strict TDD en Laravel

```bash
# Ciclo TDD
php artisan test                     # RED: escribir test → falla
# implementar mínimo
php artisan test                     # GREEN: pasa
./vendor/bin/pint                    # REFACTOR: formatear
php artisan test                     # sigue verde
```

## Estructura de Feature Tests

```php
// tests/Feature/UserTest.php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;

class UserTest extends TestCase
{
    public function test_can_create_user(): void
    {
        $response = $this->postJson("/api/users", [
            "name"  => "Liher",
            "email" => "liher@test.com",
        ]);

        $response->assertCreated()
                 ->assertJsonFragment(["name" => "Liher"]);

        $this->assertDatabaseHas("users", ["email" => "liher@test.com"]);
    }
}
```

## Controllers (API Resource)

```php
// app/Http/Controllers/UserController.php
namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;

class UserController extends Controller
{
    public function index()
    {
        return UserResource::collection(User::paginate(20));
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());
        return new UserResource($user);
    }
}
```

## Form Requests (validación)

```php
// app/Http/Requests/StoreUserRequest.php
class StoreUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            "name"  => ["required", "string", "max:255"],
            "email" => ["required", "email", "unique:users"],
        ];
    }
}
```

## API Resources (transformación)

```php
// app/Http/Resources/UserResource.php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            "id"    => $this->id,
            "name"  => $this->name,
            "email" => $this->email,
            "links" => [
                "self" => route("users.show", $this->id),
            ],
        ];
    }
}
```

## Eloquent Patterns

```php
// Scopes en el modelo
class User extends Model
{
    protected $fillable = ["name", "email", "role"];

    protected function casts(): array
    {
        return ["email_verified_at" => "datetime"];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotNull("email_verified_at");
    }
}

// Uso: User::active()->paginate(20)
```

## Rutas API

```php
// routes/api.php
Route::apiResource("users", UserController::class);
// Genera: GET /users, POST /users, GET /users/{id},
//         PUT /users/{id}, DELETE /users/{id}
```

## Anti-patterns

- Lógica de negocio en Controllers (extraer a Services/Actions)
- `User::all()` sin paginación en endpoints de listado
- Validación manual sin Form Requests
- `DB::table()` cuando existe un modelo Eloquent
- Tests sin `assertDatabaseHas/Missing` para verificar side effects
