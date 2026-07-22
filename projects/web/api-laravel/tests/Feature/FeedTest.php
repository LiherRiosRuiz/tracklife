<?php

namespace Tests\Feature;

use App\Models\SocialPost;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class FeedTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'social_posts'];

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function createTestUser(array $privacyOverrides = []): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => 'test-'.uniqid().'@test.com',
            'username' => 'testuser'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => array_merge(User::defaultPrivacySettings(), $privacyOverrides),
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

    // ─── Index: requires authentication (feed exposed privacy-sensitive data) ──

    public function test_feed_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/feed');

        $response->assertStatus(401);
    }

    // ─── Index: privacy filtering ───────────────────────────────────────────

    public function test_feed_index_hides_other_users_followers_only_post(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        // Default privacy for 'meals' is 'followers'. There is no follow-graph
        // in this codebase, so a followers-visibility post must be visible
        // only to the poster themself for now.
        $this->actingAs($userA, 'sanctum')->postJson('/api/feed', [
            'type' => 'meal_logged',
            'payload' => ['message' => 'private meal from A'],
        ])->assertStatus(201);

        $response = $this->actingAs($userB, 'sanctum')->getJson('/api/feed');

        $response->assertStatus(200);
        $feed = collect($response->json('feed'));

        $this->assertFalse($feed->contains(fn (array $post) => $post['payload']['message'] === 'private meal from A'));
    }

    public function test_feed_index_shows_own_posts_and_others_public_posts(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        // userA's own followers-visibility post: always visible to herself.
        $this->actingAs($userA, 'sanctum')->postJson('/api/feed', [
            'type' => 'meal_logged',
            'payload' => ['message' => 'my own meal'],
        ])->assertStatus(201);

        // userB's product_scanned post defaults to 'public' visibility.
        $this->actingAs($userB, 'sanctum')->postJson('/api/feed', [
            'type' => 'product_scanned',
            'payload' => ['message' => 'public scan from B'],
        ])->assertStatus(201);

        $response = $this->actingAs($userA, 'sanctum')->getJson('/api/feed');

        $response->assertStatus(200);
        $feed = collect($response->json('feed'));

        $this->assertTrue($feed->contains(fn (array $post) => $post['payload']['message'] === 'my own meal'));
        $this->assertTrue($feed->contains(fn (array $post) => $post['payload']['message'] === 'public scan from B'));
    }

    // ─── Index: user info must be correct per post, even across multiple users ─

    public function test_feed_index_attaches_correct_user_to_each_post(): void
    {
        $userA = $this->createTestUser();
        // userB's meal posts are made public here on purpose: 'meals' defaults
        // to 'followers' visibility and there is no follow-graph in this
        // codebase yet, so a followers-visibility post from another user
        // would otherwise be filtered out of userA's feed (see FeedService
        // privacy filtering). This test is about per-post user attachment
        // across authors, not about privacy rules, so we make B's post public.
        $userB = $this->createTestUser(['meals' => 'public']);

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

    // ─── Regression: privacy filter must not under-deliver a fixed-size page ───

    public function test_feed_index_returns_full_page_when_invisible_posts_occupy_naive_fetch_window(): void
    {
        $viewer = $this->createTestUser();
        // Default privacy for 'meals' is 'followers', which this codebase
        // treats as poster-only visibility (no follow graph yet) — so these
        // posts are invisible to $viewer.
        $otherUser = $this->createTestUser();

        // 60 NEWEST posts, all invisible to $viewer. A naive
        // "fetch top 50 by created_at desc, then filter" would grab
        // exclusively these and return an empty page.
        foreach (range(1, 60) as $i) {
            $post = SocialPost::create([
                'user_id' => (string) $otherUser->_id,
                'type' => 'meal_logged',
                'payload' => ['message' => "invisible {$i}"],
                'kudos_count' => 0,
                'kudos_user_ids' => [],
                'comments' => [],
            ]);
            $post->created_at = now()->addMinutes($i);
            $post->save();
        }

        // 55 OLDER posts, all visible to $viewer (their own posts).
        foreach (range(1, 55) as $i) {
            $post = SocialPost::create([
                'user_id' => (string) $viewer->_id,
                'type' => 'workout_completed',
                'payload' => ['message' => "visible {$i}"],
                'kudos_count' => 0,
                'kudos_user_ids' => [],
                'comments' => [],
            ]);
            $post->created_at = now()->subMinutes(200 - $i);
            $post->save();
        }

        $response = $this->actingAs($viewer, 'sanctum')->getJson('/api/feed');

        $response->assertStatus(200);
        $feed = $response->json('feed');

        // 55 genuinely-visible posts exist and the page size is 50, so the
        // full page must be filled with visible posts.
        $this->assertCount(50, $feed);
        $this->assertTrue(collect($feed)->every(
            fn (array $post) => str_starts_with($post['payload']['message'], 'visible')
        ));
    }
}
