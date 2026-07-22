<?php

namespace Tests\Feature;

use Illuminate\Cache\DatabaseStore;
use Illuminate\Cache\FileStore;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;
use Tests\TestCase;

/**
 * Regression test for the CACHE_STORE=database vs MongoDB incompatibility.
 *
 * Root cause: Illuminate\Cache\DatabaseStore::add() (used by every
 * RateLimiter::hit() call, i.e. every request through ThrottleRequests —
 * both the per-route auth-strict throttle and the api-global throttle
 * added across all routes) calls the query builder's insertOrIgnore().
 * MongoDB's grammar (MongoDB\Laravel\Query\Grammars\Grammar) doesn't
 * implement compileInsertOrIgnore() and its base class throws
 * unconditionally: "This database engine does not support inserting while
 * ignoring errors." Unlike the SESSION_DRIVER=database bug (see
 * SessionDriverMongoCompatTest.php), this isn't a second-write collision —
 * it fails on the very first cache write, which means every throttled
 * endpoint (including /auth/login and /auth/register) 500s on first hit.
 *
 * phpunit.xml already force-overrides CACHE_STORE=array for the test
 * suite specifically to dodge this (see its inline comment), which is why
 * `php artisan test` never caught it — it only surfaces against the real
 * container .env, exercised here by driving the app in an actual browser.
 *
 * Same fix precedent as SESSION_DRIVER: move CACHE_STORE to `file`, the
 * driver already proven safe for this MongoDB-only deployment.
 */
class CacheStoreMongoCompatTest extends TestCase
{
    public function test_database_cache_store_against_mongodb_fails_on_first_write(): void
    {
        $store = new DatabaseStore(DB::connection('mongodb'), 'cache');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('This database engine does not support inserting while ignoring errors.');

        $store->add('rate-limiter-test-key', 1, 60);
    }

    public function test_file_cache_store_handles_rate_limiter_style_writes_without_error(): void
    {
        $path = storage_path('framework/cache/_test-mongo-compat');
        File::ensureDirectoryExists($path);

        try {
            $store = new FileStore(File::getFacadeRoot(), $path);

            $this->assertTrue($store->add('rate-limiter-test-key', 1, 60));
            // A second add() on the same key must return false (already
            // present), not throw — this is exactly the increment/hit
            // pattern RateLimiter relies on for every subsequent request.
            $this->assertFalse($store->add('rate-limiter-test-key', 1, 60));
        } finally {
            File::deleteDirectory($path);
        }
    }
}
