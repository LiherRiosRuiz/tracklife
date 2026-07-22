<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\SocialPost;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class ActivityTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'activities', 'social_posts'];

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

    private function activityPayload(array $overrides = []): array
    {
        return array_merge([
            'type' => 'run',
            'title' => 'Morning Run',
            'duration_minutes' => 45,
            'distance_km' => 8.2,
            'calories' => 520,
        ], $overrides);
    }

    // ─── T1: Auth guard ──────────────────────────────────────────────────────

    public function test_activity_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/activities', $this->activityPayload());

        $response->assertStatus(401);
    }

    // ─── T2: Validation campos requeridos ────────────────────────────────────

    public function test_activity_store_fails_without_required_fields(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/activities', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type', 'title']);
    }

    // ─── T3: Tipo invalido ───────────────────────────────────────────────────

    public function test_activity_store_rejects_invalid_type(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/activities', ['type' => 'flying', 'title' => 'X']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    // ─── T3b: Longitud maxima de notes/source ────────────────────────────────

    public function test_activity_store_rejects_notes_over_500_chars(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/activities', $this->activityPayload([
                'notes' => str_repeat('a', 501),
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }

    public function test_activity_store_rejects_source_over_50_chars(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/activities', $this->activityPayload([
                'source' => str_repeat('a', 51),
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['source']);
    }

    // ─── T4: Store exitoso + calorías persistidas ─────────────────────────────

    public function test_user_can_log_cardio_activity_with_calories(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/activities', $this->activityPayload());

        $response->assertStatus(201)
            ->assertJsonStructure(['activity' => ['id', 'type', 'title', 'duration_minutes', 'distance_km', 'calories']])
            ->assertJsonPath('activity.type', 'run');

        // calories es integer en el modelo → assertSame sin cast
        $this->assertSame(520, $response->json('activity.calories'));

        $activity = $response->json('activity');
        $this->assertArrayNotHasKey('user_id', $activity);
    }

    // ─── T5: Aislamiento de listado ──────────────────────────────────────────

    public function test_user_can_list_only_their_activities(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        Activity::create([
            'user_id' => (string) $userA->_id,
            'type' => 'run',
            'title' => 'Run A',
            'date' => now(),
        ]);

        Activity::create([
            'user_id' => (string) $userB->_id,
            'type' => 'run',
            'title' => 'Run B',
            'date' => now(),
        ]);

        $response = $this->actingAs($userA, 'sanctum')
            ->getJson('/api/activities');

        $response->assertStatus(200);

        $activities = $response->json('activities');
        $this->assertCount(1, $activities);
        $this->assertArrayNotHasKey('user_id', $activities[0]);
    }

    // ─── T6: Show propio ─────────────────────────────────────────────────────

    public function test_user_can_show_their_activity(): void
    {
        $user = $this->createTestUser();

        $createResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/activities', $this->activityPayload());

        $id = $createResponse->json('activity.id');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/activities/{$id}");

        $response->assertStatus(200)
            ->assertJsonPath('activity.title', 'Morning Run');
    }

    // ─── T7: Show ajeno → 404 ────────────────────────────────────────────────

    public function test_user_cannot_show_another_users_activity(): void
    {
        $activity = Activity::create([
            'user_id' => 'other-user-id',
            'type' => 'run',
            'title' => 'Secret Run',
            'date' => now(),
        ]);

        $response = $this->actingAsTestUser()
            ->getJson("/api/activities/{$activity->_id}");

        $response->assertStatus(404);
    }

    // ─── T8: Feed side-effect ────────────────────────────────────────────────

    public function test_activity_shared_to_feed_creates_social_post(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/activities', $this->activityPayload(['shared_to_feed' => true]));

        $response->assertStatus(201);

        $this->assertSame(1, SocialPost::where('type', 'cardio_activity')->count());
    }
}
