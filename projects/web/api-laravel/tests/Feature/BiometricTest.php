<?php

namespace Tests\Feature;

use App\Models\BiometricReading;
use App\Models\SocialPost;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class BiometricTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'biometric_readings', 'social_posts'];

    // ─── Helpers ─────────────────────────────────────────────────────────────

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

    private function actingAsTestUser(): static
    {
        return $this->actingAs($this->createTestUser(), 'sanctum');
    }

    private function biometricPayload(array $overrides = []): array
    {
        return array_merge([
            'type' => 'weight',
            'value' => 75.5,
            'unit' => 'kg',
        ], $overrides);
    }

    // ─── T1: Auth guard ──────────────────────────────────────────────────────

    public function test_biometric_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/biometrics', $this->biometricPayload());

        $response->assertStatus(401);
    }

    // ─── T2: Validation campos requeridos ────────────────────────────────────

    public function test_biometric_store_fails_without_required_fields(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type', 'value']);
    }

    // ─── T3: Tipo invalido ───────────────────────────────────────────────────

    public function test_biometric_store_rejects_invalid_type(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', ['type' => 'invalid_type', 'value' => 10]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    // ─── T3b: Longitud maxima de unit/source ─────────────────────────────────

    public function test_biometric_store_rejects_unit_over_50_chars(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'unit' => str_repeat('a', 51),
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['unit']);
    }

    public function test_biometric_store_rejects_source_over_50_chars(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'source' => str_repeat('a', 51),
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['source']);
    }

    // ─── T4: Store exitoso + estructura ──────────────────────────────────────

    public function test_user_can_store_a_biometric_reading(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload());

        $response->assertStatus(201)
            ->assertJsonStructure(['reading' => ['id', 'type', 'value', 'unit', 'timestamp', 'source']])
            ->assertJsonPath('reading.type', 'weight');

        $this->assertSame(75.5, (float) $response->json('reading.value'));

        $reading = $response->json('reading');
        $this->assertArrayNotHasKey('user_id', $reading);
    }

    // ─── T5: Filtro por ventana de días ──────────────────────────────────────

    public function test_biometrics_index_filters_by_days_window(): void
    {
        $user = $this->createTestUser();

        BiometricReading::create([
            'user_id' => (string) $user->_id,
            'type' => 'weight',
            'value' => 75.0,
            'unit' => 'kg',
            'source' => 'manual',
            'timestamp' => Carbon::now(),
        ]);

        BiometricReading::create([
            'user_id' => (string) $user->_id,
            'type' => 'weight',
            'value' => 74.0,
            'unit' => 'kg',
            'source' => 'manual',
            'timestamp' => Carbon::now()->subDays(80),
        ]);

        // days=90 → debe devolver ambas (80 días atrás < 90)
        $response90 = $this->actingAs($user, 'sanctum')
            ->getJson('/api/biometrics?days=90');

        $response90->assertStatus(200);
        $this->assertCount(2, $response90->json('readings'));

        // default days=7 → solo la de hoy
        $response7 = $this->actingAs($user, 'sanctum')
            ->getJson('/api/biometrics');

        $response7->assertStatus(200);
        $this->assertCount(1, $response7->json('readings'));
    }

    // ─── T6: Filtro por tipo ─────────────────────────────────────────────────

    public function test_biometrics_index_filters_by_type(): void
    {
        $user = $this->createTestUser();

        BiometricReading::create([
            'user_id' => (string) $user->_id,
            'type' => 'weight',
            'value' => 75.0,
            'unit' => 'kg',
            'source' => 'manual',
            'timestamp' => Carbon::now(),
        ]);

        BiometricReading::create([
            'user_id' => (string) $user->_id,
            'type' => 'hrv',
            'value' => 55.0,
            'unit' => 'ms',
            'source' => 'manual',
            'timestamp' => Carbon::now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/biometrics?type=weight&days=90');

        $response->assertStatus(200);

        $readings = $response->json('readings');
        $this->assertCount(1, $readings);
        $this->assertSame('weight', $readings[0]['type']);
    }

    // ─── T7: Recovery >= 80 dispara feed ─────────────────────────────────────

    public function test_high_recovery_score_creates_feed_milestone(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', ['type' => 'recovery_score', 'value' => 85]);

        $response->assertStatus(201);

        $this->assertSame(1, SocialPost::where('type', 'recovery_milestone')->count());
    }

    // ─── T8: Today devuelve último valor por tipo ─────────────────────────────

    public function test_today_returns_latest_value_per_type(): void
    {
        $user = $this->createTestUser();

        // Recovery score de ayer (60) — valor < 80, no dispara feed
        BiometricReading::create([
            'user_id' => (string) $user->_id,
            'type' => 'recovery_score',
            'value' => 60.0,
            'unit' => null,
            'source' => 'manual',
            'timestamp' => Carbon::now()->subDay(),
        ]);

        // Recovery score de hoy (70) — valor < 80, no dispara feed
        BiometricReading::create([
            'user_id' => (string) $user->_id,
            'type' => 'recovery_score',
            'value' => 70.0,
            'unit' => null,
            'source' => 'manual',
            'timestamp' => Carbon::now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/biometrics/today');

        $response->assertStatus(200)
            ->assertJsonStructure(['summary' => ['recovery_score', 'strain', 'sleep_score', 'hrv', 'resting_hr']]);

        $this->assertSame(70.0, (float) $response->json('summary.recovery_score.value'));
        $this->assertNull($response->json('summary.strain'));
    }

    // ─── T10: Bounds por tipo — valores fuera de rango rechazados ─────────────

    public function test_biometric_store_rejects_weight_out_of_range(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'weight',
                'value' => 900,
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['value']);
    }

    public function test_biometric_store_rejects_negative_weight(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'weight',
                'value' => -5,
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['value']);
    }

    public function test_biometric_store_rejects_body_fat_over_100_percent(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'body_fat',
                'value' => 150,
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['value']);
    }

    public function test_biometric_store_rejects_strain_over_whoop_scale(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'strain',
                'value' => 25,
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['value']);
    }

    public function test_biometric_store_rejects_resting_hr_out_of_range(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'resting_hr',
                'value' => 5,
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['value']);
    }

    // ─── T11: Bounds por tipo — valores realistas aceptados ───────────────────

    public function test_biometric_store_accepts_realistic_weight(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'weight',
                'value' => 78.5,
            ]));

        $response->assertStatus(201);
    }

    public function test_biometric_store_accepts_realistic_body_fat(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'body_fat',
                'value' => 18.5,
            ]));

        $response->assertStatus(201);
    }

    public function test_biometric_store_accepts_realistic_strain(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'strain',
                'value' => 14.2,
            ]));

        $response->assertStatus(201);
    }

    public function test_biometric_store_accepts_realistic_resting_hr(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'resting_hr',
                'value' => 60,
            ]));

        $response->assertStatus(201);
    }

    public function test_biometric_store_accepts_realistic_steps(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/biometrics', $this->biometricPayload([
                'type' => 'steps',
                'value' => 8500,
            ]));

        $response->assertStatus(201);
    }

    // ─── T9: Aislamiento de datos entre usuarios ──────────────────────────────

    public function test_user_only_sees_their_own_biometrics(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        BiometricReading::create([
            'user_id' => (string) $userA->_id,
            'type' => 'weight',
            'value' => 75.0,
            'unit' => 'kg',
            'source' => 'manual',
            'timestamp' => Carbon::now(),
        ]);

        BiometricReading::create([
            'user_id' => (string) $userB->_id,
            'type' => 'weight',
            'value' => 80.0,
            'unit' => 'kg',
            'source' => 'manual',
            'timestamp' => Carbon::now(),
        ]);

        $response = $this->actingAs($userA, 'sanctum')
            ->getJson('/api/biometrics?days=90');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('readings'));
    }
}
