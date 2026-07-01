<?php

namespace Tests\Traits;

use Illuminate\Support\Facades\DB;

trait MongoTestCleanup
{
    protected function cleanMongoCollections(array $collections): void
    {
        $connection = DB::connection('mongodb');

        // ── GUARDIA DE SEGURIDAD ────────────────────────────────────────────
        // Antes de dropear NADA, verificar que estamos en una BD _testing.
        // Si no es así, abortar con excepción: mejor un test roto que un wipe
        // de producción.
        $dbName = $connection->getDatabaseName();

        if (! str_ends_with($dbName, '_testing')) {
            throw new \RuntimeException(
                "ABORT: MongoTestCleanup intentó dropear una BD que no es de test: " .
                "{$dbName}. Posible wipe de producción. " .
                "Asegúrate de que tu TestCase extiende Tests\\TestCase y llama a setUp()."
            );
        }
        // ───────────────────────────────────────────────────────────────────

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
