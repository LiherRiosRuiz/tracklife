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
}
