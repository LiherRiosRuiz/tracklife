<?php

namespace Tests\Feature;

use App\Models\SocialPost;
use App\Models\User;
use App\Models\Workout;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class WorkoutTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'workouts', 'social_posts'];

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

    private function workoutPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Push Day',
            'sets' => [
                ['exercise' => 'Bench Press', 'reps' => 10, 'weight' => 60],
                ['exercise' => 'Bench Press', 'reps' => 8,  'weight' => 65],
            ],
        ], $overrides);
    }

    // ─── T1: Auth guard ──────────────────────────────────────────────────────

    public function test_workout_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/workouts', $this->workoutPayload());

        $response->assertStatus(401);
    }

    // ─── T2: Validation ──────────────────────────────────────────────────────

    public function test_workout_store_fails_without_required_fields(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'sets']);
    }

    // ─── T3: Store + volume ──────────────────────────────────────────────────

    public function test_user_can_create_workout_with_calculated_volume(): void
    {
        // 60*10 + 65*8 = 600 + 520 = 1120
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload());

        $response->assertStatus(201)
            ->assertJsonStructure(['workout' => ['id', 'name', 'sets', 'total_volume']]);

        $this->assertSame(1120.0, (float) $response->json('workout.total_volume'));
    }

    // ─── T4: Resource no expone user_id ──────────────────────────────────────

    public function test_workout_resource_does_not_expose_user_id(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload());

        $response->assertStatus(201);

        $workout = $response->json('workout');
        $this->assertArrayHasKey('id', $workout);
        $this->assertArrayNotHasKey('user_id', $workout);
    }

    // ─── T5: Aislamiento de listado ──────────────────────────────────────────

    public function test_user_can_list_only_their_workouts(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        Workout::create([
            'user_id' => (string) $userA->_id,
            'name' => 'Workout A',
            'sets' => [],
            'total_volume' => 0,
            'date' => now()->toDateString(),
        ]);

        Workout::create([
            'user_id' => (string) $userB->_id,
            'name' => 'Workout B',
            'sets' => [],
            'total_volume' => 0,
            'date' => now()->toDateString(),
        ]);

        $response = $this->actingAs($userA, 'sanctum')
            ->getJson('/api/workouts');

        $response->assertStatus(200);

        $workouts = $response->json('workouts');
        $this->assertCount(1, $workouts);
        $this->assertArrayNotHasKey('user_id', $workouts[0]);
    }

    // ─── T6: Show propio ─────────────────────────────────────────────────────

    public function test_user_can_show_their_workout(): void
    {
        $user = $this->createTestUser();

        $createResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/workouts', $this->workoutPayload());

        $id = $createResponse->json('workout.id');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/workouts/{$id}");

        $response->assertStatus(200)
            ->assertJsonPath('workout.name', 'Push Day');
    }

    // ─── T7: Show ajeno → 404 ────────────────────────────────────────────────

    public function test_user_cannot_show_another_users_workout(): void
    {
        $workout = Workout::create([
            'user_id' => 'other-user-id',
            'name' => 'Secret Workout',
            'sets' => [],
            'total_volume' => 0,
            'date' => now()->toDateString(),
        ]);

        $response = $this->actingAsTestUser()
            ->getJson("/api/workouts/{$workout->_id}");

        $response->assertStatus(404);
    }

    // ─── T8: Feed side-effect ────────────────────────────────────────────────

    public function test_workout_shared_to_feed_creates_social_post(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload(['shared_to_feed' => true]));

        $response->assertStatus(201);

        $this->assertSame(1, SocialPost::where('type', 'workout_completed')->count());
    }

    // ─── T9: Rechaza weight fuera de rango ──────────────────────────────────

    public function test_workout_store_rejects_set_with_weight_over_max(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload([
                'sets' => [
                    ['exercise' => 'Bench Press', 'reps' => 10, 'weight' => 1001],
                ],
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sets.0.weight']);
    }

    // ─── T10: Rechaza reps fuera de rango ───────────────────────────────────

    public function test_workout_store_rejects_set_with_reps_over_max(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload([
                'sets' => [
                    ['exercise' => 'Bench Press', 'reps' => 1001, 'weight' => 60],
                ],
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sets.0.reps']);
    }

    // ─── T11: Rechaza weight negativo ───────────────────────────────────────

    public function test_workout_store_rejects_set_with_negative_weight(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload([
                'sets' => [
                    ['exercise' => 'Bench Press', 'reps' => 10, 'weight' => -5],
                ],
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sets.0.weight']);
    }

    // ─── T12: Rechaza sets array por encima del maximo ──────────────────────

    public function test_workout_store_rejects_sets_array_over_max_count(): void
    {
        $sets = array_fill(0, 201, ['exercise' => 'Bench Press', 'reps' => 10, 'weight' => 60]);

        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload(['sets' => $sets]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sets']);
    }

    // ─── T13: Rechaza duration_minutes negativo ─────────────────────────────

    public function test_workout_store_rejects_negative_duration_minutes(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload(['duration_minutes' => -10]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['duration_minutes']);
    }

    // ─── T13b: Rechaza notes por encima de 500 caracteres ───────────────────

    public function test_workout_store_rejects_notes_over_500_chars(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload([
                'notes' => str_repeat('a', 501),
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }

    // ─── T14: Acepta un workout realista dentro de los limites ──────────────

    public function test_workout_store_accepts_realistic_workout_at_boundaries(): void
    {
        $sets = array_fill(0, 200, ['exercise' => 'Deadlift', 'reps' => 1000, 'weight' => 1000, 'type' => 'failure']);

        $response = $this->actingAsTestUser()
            ->postJson('/api/workouts', $this->workoutPayload([
                'sets' => $sets,
                'duration_minutes' => 0,
            ]));

        $response->assertStatus(201);
    }
}
