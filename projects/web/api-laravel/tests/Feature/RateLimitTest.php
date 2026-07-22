<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class RateLimitTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens'];

    // ─── /auth/login must be throttled against brute-force/enumeration ─────────

    public function test_login_endpoint_is_rate_limited_after_repeated_attempts(): void
    {
        User::create([
            'name' => 'Throttle User',
            'email' => 'throttle@test.com',
            'username' => 'throttleuser',
            'password' => 'correctpassword',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        // The login route is throttled to 5 requests/minute. The first 5
        // attempts should be processed normally (422 for wrong credentials).
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'throttle@test.com',
                'password' => 'wrongpassword',
            ])->assertStatus(422);
        }

        // The 6th attempt within the same window must be throttled.
        $response = $this->postJson('/api/auth/login', [
            'email' => 'throttle@test.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(429);
    }

    // ─── Throttle buckets must key off the real client, not the proxy hop ──────

    public function test_login_throttle_buckets_are_isolated_per_forwarded_client_ip(): void
    {
        User::create([
            'name' => 'Throttle User',
            'email' => 'throttle2@test.com',
            'username' => 'throttleuser2',
            'password' => 'correctpassword',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        // Every real request in production arrives from Traefik's single
        // internal bridge-network IP (see bootstrap/app.php trustProxies
        // config) and is differentiated only by X-Forwarded-For. Simulate
        // that here: same "immediate hop" IP for both simulated clients,
        // different X-Forwarded-For per client.
        $this->withServerVariables(['REMOTE_ADDR' => '172.20.0.5']);

        $attempt = fn (string $forwardedFor) => $this->postJson('/api/auth/login', [
            'email' => 'throttle2@test.com',
            'password' => 'wrongpassword',
        ], ['X-Forwarded-For' => $forwardedFor]);

        // Client A (forwarded IP 203.0.113.10) burns through its whole
        // 5-request budget.
        for ($i = 0; $i < 5; $i++) {
            $attempt('203.0.113.10')->assertStatus(422);
        }

        // Client A is now throttled.
        $attempt('203.0.113.10')->assertStatus(429);

        // Client B (a different forwarded IP, same proxy hop) must have its
        // own independent budget — it must NOT already be throttled just
        // because it shares Traefik's internal IP with client A.
        $attempt('203.0.113.20')->assertStatus(422);
    }
}
