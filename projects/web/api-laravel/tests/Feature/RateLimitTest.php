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
}
