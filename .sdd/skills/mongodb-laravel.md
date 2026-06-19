---
skill: mongodb-laravel
version: "mongodb/laravel-mongodb@5.7 + MongoDB 7"
projects: [api-laravel]
triggers: [mongodb, mongo, laravel-mongodb, document, collection, embedded, aggregation, mongodump, nosql]
---

# MongoDB 7 + Laravel 13 — Patrones del stack LIHER

## Stack

- MongoDB 7 (contenedor `infra/mongodb`, red interna `backend_net`, sin exponer)
- Package: `mongodb/laravel-mongodb@5.7` (sucesor oficial de `jenssegers/laravel-mongodb`)
- Conexión: `mongodb` definida en `config/database.php` (driver `mongodb`)
- Estado en LIHER: package instalado, conexión **pendiente de cablear** (hoy los tests
  corren contra SQLite). Esta skill describe el patrón objetivo para cuando se cablee.

> Nota: NO se reemplaza `laravel-13.md` — los patrones de Controllers, Form Requests,
> API Resources, rutas y estructura de tests siguen siendo Eloquent/Laravel estándar.
> Lo que cambia es la capa de persistencia: el modelo, las queries y las aserciones de test.

## Modelos: DocumentModel vs extender Model del paquete

`mongodb/laravel-mongodb@5.7` ofrece dos formas de declarar un modelo Mongo. En LIHER
se prefiere el **trait `DocumentModel`** sobre un `Eloquent\Model` normal: mantiene
compatibilidad con el resto del ecosistema Eloquent (Resources, Policies, relaciones
mixtas SQL↔Mongo) sin forzar una jerarquía de herencia paralela.

```php
// app/Models/Activity.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use MongoDB\Laravel\Eloquent\DocumentModel;

class Activity extends Model
{
    use DocumentModel;

    protected $connection = "mongodb";

    // En Mongo no hay tablas: se usa $collection en lugar de $table
    protected $collection = "activities";

    protected $fillable = ["title", "user_id", "tags", "metadata"];

    protected function casts(): array
    {
        return [
            "metadata"   => "array",
            "started_at" => "datetime",
        ];
    }
}
```

Diferencias clave frente a un modelo SQL/Eloquent:

- `$table` → `$collection` (Mongo no tiene esquema fijo: la "tabla" es una colección de documentos)
- No hace falta migración para crear la colección (se crea al insertar el primer documento),
  pero SÍ conviene declarar índices explícitamente (ver más abajo)
- El campo `_id` es un `ObjectId` por defecto, no un entero autoincremental — si el
  modelo se relaciona con tablas SQL (p.ej. `users`), decide explícitamente qué tipo
  de identificador cruza el límite SQL↔Mongo

## Embedded documents

Mongo permite anidar documentos dentro de un documento padre, evitando joins. Hay dos
aproximaciones según la complejidad del documento embebido:

**1) Array casteado (para estructuras simples, sin necesidad de query independiente):**

```php
protected function casts(): array
{
    return ["tags" => "array"];
}

// Uso
$activity->tags = ["running", "outdoor"];
$activity->save();
```

**2) Relaciones `embedsMany` / `embedsOne` (para sub-documentos con su propia identidad):**

```php
// app/Models/Activity.php
public function laps()
{
    return $this->embedsMany(Lap::class);
}

// app/Models/Lap.php
class Lap extends Model
{
    use DocumentModel;
    protected $fillable = ["distance_km", "duration_seconds"];
}

// Uso — operan como colecciones embebidas, persisten al padre
$activity->laps()->save(new Lap(["distance_km" => 5, "duration_seconds" => 1800]));
$activity->laps; // Illuminate\Support\Collection<Lap>
```

Regla práctica: si el sub-documento se consulta SIEMPRE junto al padre y nunca de
forma independiente → embeber. Si necesita queries propias, paginación o crece sin
límite (p.ej. logs de eventos) → colección separada con referencia por `_id`.

## Operadores de query específicos de Mongo

El query builder de `laravel-mongodb` extiende la sintaxis fluida de Eloquent con
operadores que no existen en SQL. Los más usados en LIHER:

```php
use MongoDB\BSON\Regex;

// Coincidencia parcial / case-insensitive (equivalente a LIKE, pero indexable distinto)
Activity::where("title", "regex", new Regex("^morning", "i"))->get();

// elemMatch: el array debe contener AL MENOS UN elemento que cumpla todas las condiciones
Activity::where("laps", "elemMatch", [
    "distance_km"      => ["$gte" => 5],
    "duration_seconds" => ["$lte" => 1800],
])->get();

// Operadores de comparación dentro de where (se traducen a $gte, $lte, $in, $nin...)
Activity::where("started_at", ">=", now()->subDays(7))->get();
Activity::whereIn("status", ["completed", "in_progress"])->get();

// Operaciones atómicas sobre documentos (evitan race conditions sin transacción)
Activity::where("_id", $id)->increment("views");
Activity::where("_id", $id)->push("tags", "featured");      // añade a array
Activity::where("_id", $id)->pull("tags", "draft");          // elimina de array
```

Anti-patrón: traducir mentalmente un `JOIN` SQL a Mongo. Si la query necesita combinar
datos de dos colecciones, la opción nativa es una **aggregation pipeline** (`$lookup`)
o, más simple en la mayoría de casos de LIHER, resolver en dos pasos desde PHP.

## Índices

Mongo no exige esquema, pero SÍ se beneficia (mucho) de índices explícitos. Se declaran
con `Schema` apuntando a la conexión `mongodb`:

```php
// database/migrations/xxxx_add_indexes_to_activities.php
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

Schema::connection("mongodb")->table("activities", function (Blueprint $collection) {
    $collection->index("user_id");
    $collection->index([["started_at", -1]]);          // orden descendente
    $collection->unique("external_id");
    $collection->index(["title" => "text"]);            // índice de texto completo
});
```

Reglas de LIHER:

- Todo campo usado en `where()` de un endpoint de listado debe tener índice
- Índices compuestos: el orden de los campos importa (el más selectivo primero)
- Revisar con `db.collection.explain("executionStats")` antes de dar por buena una query lenta

## Transacciones

MongoDB soporta transacciones ACID multi-documento **solo sobre un replica set**
(no sobre una instancia standalone). El contenedor de LIHER debe arrancar como
replica set de un solo nodo para que esto funcione — verificar en calibración antes
de depender de transacciones en producción.

```php
use Illuminate\Support\Facades\DB;

DB::connection("mongodb")->transaction(function () {
    $activity = Activity::create([...]);
    UserStats::where("user_id", $activity->user_id)->increment("activities_count");
});
```

Si el replica set no está disponible, preferir **operaciones atómicas a nivel de
documento** (`increment`, `push`, `pull`, actualizaciones con `$set` sobre un único
`_id`) en lugar de transacciones — son la forma idiomática de Mongo de evitar
inconsistencias sin pagar el coste de coordinación distribuida.

## Testing: por qué `assertDatabaseHas` con sintaxis SQL falla (o miente)

`assertDatabaseHas("activities", ["title" => "Morning run"])` funciona contra la
conexión `mongodb` para comparaciones de campos planos de primer nivel — pero deja
de ser fiable en cuanto el documento tiene:

- **Campos anidados / embebidos**: `["metadata.distance" => 5]` no se traduce igual
  que en SQL; Mongo necesita notación de punto explícita y tipos BSON correctos
- **Tipos BSON**: un `ObjectId`, una `UTCDateTime` o un `Decimal128` no son iguales
  a su representación en string/PHP — la aserción puede dar falso negativo (o, peor,
  falso positivo si ambos lados castean igual por accidente)
- **Arrays**: comprobar que un array "contiene" un elemento requiere `$elemMatch`,
  no una comparación de igualdad

**Patrón recomendado en LIHER**: consultar el documento real desde el modelo y
asertar sobre la estructura PHP, no sobre el query builder de test:

```php
public function test_creates_activity_with_laps(): void
{
    $response = $this->postJson("/api/activities", [
        "title" => "Morning run",
        "laps"  => [["distance_km" => 5, "duration_seconds" => 1800]],
    ]);

    $response->assertCreated();

    $activity = Activity::where("title", "Morning run")->first();

    $this->assertNotNull($activity);
    $this->assertCount(1, $activity->laps);
    $this->assertSame(5, $activity->laps->first()->distance_km);
}
```

Esto es más verboso que `assertDatabaseHas`, pero verifica lo que realmente importa
(la estructura del documento persistido) en lugar de confiar en una traducción
SQL→Mongo que el paquete hace "lo mejor que puede".

## Anti-patterns

- Tratar una colección como una tabla SQL: sin índices, sin pensar en la forma del
  documento, normalizando en exceso (re-creando joins que Mongo no necesita)
- `assertDatabaseHas`/`assertDatabaseMissing` con sintaxis SQL para documentos con
  campos anidados, arrays o tipos BSON — usar consulta directa + aserciones PHP
- Usar transacciones multi-documento como sustituto por defecto de un buen diseño
  de documento (si necesitas transacciones en cada escritura, probablemente el
  documento está mal modelado)
- Mezclar `_id` (ObjectId) e IDs enteros autoincrementales sin una decisión explícita
  de qué tipo cruza el límite SQL↔Mongo (relevante mientras conviven SQLite y MongoDB)
- Migrar 1:1 un esquema relacional normalizado a colecciones sin replantear qué debe
  embeberse — es la forma más común de heredar los problemas de SQL sin sus garantías
