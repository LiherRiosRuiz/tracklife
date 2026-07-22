<?php

namespace Tests\Feature;

use Illuminate\Session\DatabaseSessionHandler;
use Illuminate\Session\FileSessionHandler;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use MongoDB\Driver\Exception\BulkWriteException;
use MongoDB\Laravel\Schema\Blueprint;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

/**
 * Regression test for the SESSION_DRIVER=database vs MongoDB incompatibility.
 *
 * Root cause: Laravel's stock Illuminate\Session\DatabaseSessionHandler is
 * SQL-oriented. On every write it calls:
 *
 *   $this->getQuery()->insert(Arr::set($payload, 'id', $sessionId))
 *
 * i.e. it inserts a document with a plain `id` field holding the session ID
 * string. But mongodb/laravel-mongodb's query builder
 * (MongoDB\Laravel\Query\Grammar::prepareFieldsForQuery(), called from
 * Builder::insert()) treats any top-level `id` key as an alias for Mongo's
 * `_id` primary key: it silently renames `id` -> `_id` and *unsets* `id`
 * before the insertMany() call. So the document that actually lands in
 * Mongo has an `_id` but NO `id` field at all.
 *
 * The `sessions` collection has a unique index on `id`. MongoDB indexes
 * treat a missing field as if it were `null`, and a unique index allows at
 * most one document with that null value. So: the very first session write
 * succeeds (nothing else has a null `id` yet), but the *next* distinct
 * session write (a different browser tab, a concurrent request, or simply
 * the next request once the first "session" round-trips) also produces a
 * document with no `id` field -> also indexed as null -> collides with the
 * first one -> `E11000 duplicate key error ... id_1 dup key: { id: null }`,
 * exactly as seen in storage/logs/laravel.log.
 *
 * This is a known class of incompatibility between Laravel's generic
 * SQL session handler and document stores — mongodb/laravel-mongodb ships
 * its own MongoDB\Laravel\Session\MongoDbSessionHandler (registered under
 * the 'mongodb' driver name, not 'database') specifically to avoid it.
 *
 * Given this API authenticates purely via Sanctum Bearer tokens (see the
 * Bug-1 fix removing statefulApi() from bootstrap/app.php — nothing in
 * this codebase relies on cookie/session-based auth), sessions aren't load
 * bearing here at all. Rather than adopt the untested `mongodb` session
 * driver, the .env.example/.env fix simply moves SESSION_DRIVER to `file`
 * — the driver already proven to work (it was the local stopgap) and one
 * that carries no dependency on the Mongo document/`id` mismatch above.
 */
class SessionDriverMongoCompatTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['sessions'];

    protected function setUp(): void
    {
        parent::setUp();

        // The live tracklife.sessions collection carries a unique index on
        // `id` (verified via mongosh: { key: { id: 1 }, name: 'id_1',
        // unique: true }) — there is no migration for it in this repo (it
        // predates version control / was created out of band), so
        // MongoTestCleanup's collection drop in tearDown() loses it every
        // run. Recreate it here so this test exercises the exact same
        // constraint that caused the production E11000 errors.
        Schema::connection('mongodb')->table('sessions', function (Blueprint $collection) {
            $collection->unique('id');
        });
    }

    public function test_database_session_driver_against_mongodb_hits_duplicate_id_null(): void
    {
        $connection = DB::connection('mongodb');

        // First write: a fresh handler instance, as a real request would
        // build one. This succeeds and creates a document with no `id`
        // field (renamed to `_id` by the mongodb query builder).
        $first = new DatabaseSessionHandler($connection, 'sessions', 120);
        $first->write('first-session-id', 'serialized-payload-one');

        $this->expectException(BulkWriteException::class);
        $this->expectExceptionMessageMatches('/E11000 duplicate key error/');

        // Second write: a *different* session ID, new handler instance
        // (as a separate request would get) — this is what a second
        // concurrent-ish browser request without a matching existing
        // session produces. It also lacks `id`, colliding on the unique
        // index's null entry.
        $second = new DatabaseSessionHandler($connection, 'sessions', 120);
        $second->write('second-session-id', 'serialized-payload-two');
    }

    public function test_file_session_driver_handles_rapid_distinct_sessions_without_error(): void
    {
        $path = storage_path('framework/sessions/_test-mongo-compat');
        File::ensureDirectoryExists($path);

        try {
            // Same shape of repro as above (several distinct, sessionless
            // "requests" in a row) but against the driver the fix actually
            // switches .env.example/.env to. No shared DB uniqueness
            // constraint is involved, so no E11000-equivalent failure mode
            // exists here.
            for ($i = 0; $i < 5; $i++) {
                $handler = new FileSessionHandler(File::getFacadeRoot(), $path, 120);
                $handler->write("session-{$i}", "serialized-payload-{$i}");
            }

            $this->assertCount(5, File::files($path));
        } finally {
            File::deleteDirectory($path);
        }
    }
}
