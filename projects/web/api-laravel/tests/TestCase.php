<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->forceMongoTestDatabase();
    }

    /**
     * Fuerza que la conexión mongodb apunte a una BD _testing.
     *
     * El docker-compose inyecta APP_ENV=local y MONGODB_URI con la BD de
     * producción (tracklife). Esto impide que phpunit.xml o .env.testing
     * surtan efecto. En su lugar, manipulamos la config en runtime antes
     * de que cualquier test toque la base de datos.
     */
    private function forceMongoTestDatabase(): void
    {
        $currentDsn = config('database.connections.mongodb.dsn', '');
        $currentDb  = config('database.connections.mongodb.database', '');

        // Si ya estamos en _testing, no hacer nada (idempotente)
        if (str_ends_with($currentDb, '_testing')) {
            return;
        }

        // Derivar la DSN de test reemplazando el nombre de BD en la DSN.
        // Ejemplo: /tracklife? → /tracklife_testing?
        // La DSN puede tener formato:  ...@host:port/dbname?options
        //                          o: ...@host:port/dbname  (sin query string)
        $testDsn = preg_replace(
            '#(/[^/?]+)(\?|$)#',
            '$1_testing$2',
            $currentDsn
        );

        // Si el regex no cambió nada (DSN sin segmento de path), añadir sufijo
        // al campo 'database' igualmente.
        $testDb = $currentDb . '_testing';

        // Actualizar la config en memoria (no persiste fuera del proceso)
        config([
            'database.connections.mongodb.dsn'      => $testDsn,
            'database.connections.mongodb.database' => $testDb,
        ]);

        // Purgar la conexión para que Laravel la reconstruya con la nueva config
        DB::purge('mongodb');
    }
}
