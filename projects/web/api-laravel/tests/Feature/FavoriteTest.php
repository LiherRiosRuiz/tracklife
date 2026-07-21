<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class FavoriteTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'favorites'];

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

    // ─── T1/T2: Auth guard ───────────────────────────────────────────────────

    public function test_favorites_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/favorites');

        $response->assertStatus(401);
    }

    public function test_store_favorite_requires_authentication(): void
    {
        $response = $this->postJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana']);

        $response->assertStatus(401);
    }

    // ─── T5: Happy path store ────────────────────────────────────────────────

    public function test_store_creates_new_favorite_returns_201(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana']);

        $response->assertStatus(201)
            ->assertJsonPath('favorite.type', 'food')
            ->assertJsonPath('favorite.ref', 'Banana');

        $this->assertSame(1, Favorite::where('type', 'food')->where('ref', 'Banana')->count());
    }

    // ─── T6: Resource hides user_id ──────────────────────────────────────────

    public function test_favorite_resource_does_not_expose_user_id(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana']);

        $favorite = $response->json('favorite');
        $this->assertArrayHasKey('id', $favorite);
        $this->assertArrayNotHasKey('user_id', $favorite);
    }

    // ─── T8: Isolation on list ────────────────────────────────────────────────

    public function test_user_lists_only_their_favorites(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        Favorite::create(['user_id' => (string) $userA->_id, 'type' => 'food', 'ref' => 'Banana']);
        Favorite::create(['user_id' => (string) $userA->_id, 'type' => 'recipe', 'ref' => 'r1']);
        Favorite::create(['user_id' => (string) $userB->_id, 'type' => 'food', 'ref' => 'Rice']);

        $response = $this->actingAs($userA, 'sanctum')->getJson('/api/favorites');

        $response->assertStatus(200);

        $favorites = $response->json('favorites');
        $this->assertCount(2, $favorites);
        $this->assertArrayNotHasKey('user_id', $favorites[0]);
    }
}
