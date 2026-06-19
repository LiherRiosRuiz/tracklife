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
