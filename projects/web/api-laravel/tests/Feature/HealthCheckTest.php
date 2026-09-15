<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * The probe used to return a fixed 'ok' literal without touching the database,
 * so an uptime monitor would report green while MongoDB was unreachable and
 * every real endpoint was failing.
 *
 * The outage path is verified manually (stop the mongodb container and the
 * endpoint returns 503 / "unreachable") rather than here: faking a dead
 * connection inside the suite would assert against the mock, not the probe.
 */
class HealthCheckTest extends TestCase
{
    public function test_health_reports_ok_and_confirms_the_database_when_reachable(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson([
                'status' => 'ok',
                'app' => 'TRACKLIFE API',
                // The point of the change: the probe states the DB was actually
                // checked, instead of implying health it never verified.
                'database' => 'ok',
            ]);
    }

    public function test_health_needs_no_authentication(): void
    {
        // Monitors call it without credentials.
        $this->getJson('/api/health')->assertOk();
    }
}
