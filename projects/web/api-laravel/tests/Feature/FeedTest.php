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

    // ─── Index: user info must be correct per post, even across multiple users ─

    public function test_feed_index_attaches_correct_user_to_each_post(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        $this->actingAs($userA, 'sanctum')->postJson('/api/feed', [
            'type' => 'workout_completed',
            'payload' => ['message' => 'from A'],
        ])->assertStatus(201);

        $this->actingAs($userB, 'sanctum')->postJson('/api/feed', [
            'type' => 'meal_logged',
            'payload' => ['message' => 'from B'],
        ])->assertStatus(201);

        $response = $this->actingAs($userA, 'sanctum')->getJson('/api/feed');

        $response->assertStatus(200);
        $feed = $response->json('feed');

        $this->assertCount(2, $feed);

        $postFromA = collect($feed)->firstWhere('payload.message', 'from A');
        $postFromB = collect($feed)->firstWhere('payload.message', 'from B');

        $this->assertNotNull($postFromA);
        $this->assertNotNull($postFromB);
        $this->assertSame((string) $userA->_id, $postFromA['user']['id']);
        $this->assertSame($userA->username, $postFromA['user']['username']);
        $this->assertSame((string) $userB->_id, $postFromB['user']['id']);
        $this->assertSame($userB->username, $postFromB['user']['username']);
    }

    // ─── Index: pagination beyond the first page of results ────────────────

    public function test_feed_index_paginates_beyond_first_page(): void
    {
        $user = $this->createTestUser();

        foreach (range(1, 55) as $i) {
            $this->actingAs($user, 'sanctum')->postJson('/api/feed', [
                'type' => 'workout_completed',
                'payload' => ['message' => "post {$i}"],
            ])->assertStatus(201);
        }

        $firstPage = $this->actingAs($user, 'sanctum')->getJson('/api/feed');
        $firstPage->assertStatus(200);
        $this->assertCount(50, $firstPage->json('feed'));

        $secondPage = $this->actingAs($user, 'sanctum')->getJson('/api/feed?page=2');
        $secondPage->assertStatus(200);
        $secondFeed = $secondPage->json('feed');

        $this->assertCount(5, $secondFeed);

        $firstPageIds = collect($firstPage->json('feed'))->pluck('id');
        $secondPageIds = collect($secondFeed)->pluck('id');

        $this->assertEmpty($firstPageIds->intersect($secondPageIds));
    }
}
