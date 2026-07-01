<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Invariante de aislamiento de base de datos.
 *
 * Garantiza que TODOS los tests corren contra una BD _testing y nunca
 * contra la base de datos de producción. Este test fija el invariante
 * para siempre: si el mecanismo de aislamiento se rompe, este test falla
 * ANTES de que ningún dato de producción sea afectado.
 */
class TestDatabaseIsolationTest extends TestCase
{
    public function test_mongodb_connection_uses_testing_database(): void
    {
        $dbName = DB::connection('mongodb')->getDatabaseName();

        $this->assertStringEndsWith(
            '_testing',
            $dbName,
            "La conexión mongodb debe apuntar a una BD que termine en '_testing'. " .
            "BD actual: '{$dbName}'. " .
            "El mecanismo de aislamiento en TestCase::forceMongoTestDatabase() no funcionó."
        );
    }
}
