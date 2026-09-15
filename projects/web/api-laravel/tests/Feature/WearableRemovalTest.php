<?php

namespace Tests\Feature;

use App\Models\BiometricReading;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

/**
 * Guards the removal of the wearable endpoints.
 *
 * sync() used to build six readings with rand() and persist them via
 * BiometricReading::create() with source => $provider, making fabricated health
 * data indistinguishable from real data at rest. Those rows then fed
 * GET /biometrics, GET /biometrics/today and CoachService::dailyInsights, which
 * emitted genuine health advice from an invented recovery_score.
 *
 * This test exists so that path cannot come back unnoticed.
 */
class WearableRemovalTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'biometric_readings'];

    private function createTestUser(): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => 'test-'.uniqid().'@test.com',
            'username' => 'testuser'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);
    }

    public function test_wearable_sync_route_no_longer_exists(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user)
            ->postJson('/api/wearables/zepp/sync')
            ->assertNotFound();
    }

    public function test_wearable_connect_and_index_routes_no_longer_exist(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user)->postJson('/api/wearables/connect', ['provider' => 'whoop'])->assertNotFound();
        $this->actingAs($user)->getJson('/api/wearables')->assertNotFound();
    }

    public function test_calling_the_removed_sync_route_creates_no_biometric_readings(): void
    {
        $user = $this->createTestUser();
        $before = BiometricReading::count();

        $this->actingAs($user)->postJson('/api/wearables/zepp/sync');

        // The real defect was never the 200 response — it was the six fabricated
        // rows it left behind on every call.
        $this->assertSame($before, BiometricReading::count());
    }

    public function test_manual_entry_still_works_for_the_metrics_sync_used_to_produce(): void
    {
        $user = $this->createTestUser();

        // sleep_score / hrv / recovery_score / strain had no producer other than
        // the fake sync. They must remain reachable by hand, or removing sync
        // would have left those pages permanently blank.
        foreach ([['sleep_score', 82, '%'], ['hrv', 65, 'ms'], ['recovery_score', 71, '%'], ['strain', 12, 'score']] as [$type, $value, $unit]) {
            $this->actingAs($user)
                ->postJson('/api/biometrics', ['type' => $type, 'value' => $value, 'unit' => $unit])
                ->assertCreated();
        }

        $this->assertSame(4, BiometricReading::where('user_id', (string) $user->_id)->count());
    }
}
