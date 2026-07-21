<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class FeedTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'social_posts'];

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

    // ─── Store: `type` must be one of the known post types ──────────────────

    public function test_feed_post_store_rejects_unknown_type(): void
    {
        $response = $this->actingAsTestUser()->postJson('/api/feed', [
            'type' => str_repeat('a', 60),
            'payload' => ['message' => 'hi'],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_feed_post_store_accepts_known_type(): void
    {
        $response = $this->actingAsTestUser()->postJson('/api/feed', [
            'type' => 'workout_completed',
            'payload' => ['message' => 'Finished leg day'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('post.type', 'workout_completed');
    }

    public function test_feed_post_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/feed', [
            'type' => 'workout_completed',
            'payload' => ['message' => 'hi'],
        ]);

        $response->assertStatus(401);
    }
}
