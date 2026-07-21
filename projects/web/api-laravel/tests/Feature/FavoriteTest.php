<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use MongoDB\Driver\Exception\BulkWriteException;
use MongoDB\Laravel\Schema\Blueprint;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class FavoriteTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'favorites'];

    protected function setUp(): void
    {
        parent::setUp();

        // MongoTestCleanup dropea la colección `favorites` completa (con sus
        // índices) en el tearDown de cada test, así que reinstalamos aquí el
        // mismo índice compuesto único que crea la migración
        // 2026_07_21_120000_add_unique_index_to_favorites_collection.php.
        // FavoriteController::store() depende de que este índice exista para
        // detectar duplicados vía excepción en vez de un find-then-insert.
        Schema::connection('mongodb')->table('favorites', function (Blueprint $collection) {
            $collection->unique(['user_id', 'type', 'ref']);
        });
    }

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

    public function test_destroy_favorite_requires_authentication(): void
    {
        $response = $this->deleteJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana']);

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
        foreach ($favorites as $favorite) {
            $this->assertArrayNotHasKey('user_id', $favorite);
        }
    }

    // ─── T12: Same ref favorited independently by two users ─────────────────

    public function test_same_ref_favorited_independently_by_two_users(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        $responseA = $this->actingAs($userA, 'sanctum')
            ->postJson('/api/favorites', ['type' => 'recipe', 'ref' => 'shared-recipe']);
        $responseB = $this->actingAs($userB, 'sanctum')
            ->postJson('/api/favorites', ['type' => 'recipe', 'ref' => 'shared-recipe']);

        $responseA->assertStatus(201);
        $responseB->assertStatus(201);

        $this->assertSame(1, Favorite::where('user_id', (string) $userA->_id)
            ->where('type', 'recipe')->where('ref', 'shared-recipe')->count());
        $this->assertSame(1, Favorite::where('user_id', (string) $userB->_id)
            ->where('type', 'recipe')->where('ref', 'shared-recipe')->count());
        $this->assertSame(2, Favorite::where('type', 'recipe')->where('ref', 'shared-recipe')->count());
    }

    // ─── T7: Idempotent store ─────────────────────────────────────────────────

    public function test_store_existing_favorite_returns_200(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana'])
            ->assertStatus(201);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana']);

        $response->assertStatus(200);

        $this->assertSame(1, Favorite::where('user_id', (string) $user->_id)
            ->where('type', 'food')->where('ref', 'Banana')->count());
    }

    // ─── T9/T10: Destroy idempotency ─────────────────────────────────────────

    public function test_destroy_removes_favorite_returns_200_with_message(): void
    {
        $user = $this->createTestUser();

        Favorite::create(['user_id' => (string) $user->_id, 'type' => 'food', 'ref' => 'Banana']);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana']);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Favorito eliminado');

        $this->assertSame(0, Favorite::where('user_id', (string) $user->_id)
            ->where('type', 'food')->where('ref', 'Banana')->count());
    }

    public function test_destroy_absent_favorite_still_returns_200(): void
    {
        $response = $this->actingAsTestUser()
            ->deleteJson('/api/favorites', ['type' => 'recipe', 'ref' => 'unknown-id']);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Favorito eliminado');
    }

    // ─── T3/T4: Validation ───────────────────────────────────────────────────

    public function test_store_fails_without_required_fields(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/favorites', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type', 'ref']);
    }

    public function test_store_rejects_invalid_type(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/favorites', ['type' => 'gadget', 'ref' => 'Banana']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    // ─── Corrective: ref length cap (unbounded string accepted 10k chars in smoke test) ─

    public function test_store_rejects_ref_exceeding_max_length(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => str_repeat('a', 121)]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['ref']);
    }

    public function test_store_accepts_ref_at_max_length(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => str_repeat('a', 120)]);

        $response->assertStatus(201)
            ->assertJsonPath('favorite.ref', str_repeat('a', 120));
    }

    // ─── T13: Unique compound index prevents duplicate (user_id, type, ref) ──

    public function test_unique_index_rejects_duplicate_favorite_at_db_level(): void
    {
        // El índice único ya lo instala setUp(); aquí solo lo ejercemos.
        $userId = (string) $this->createTestUser()->_id;

        Favorite::create(['user_id' => $userId, 'type' => 'food', 'ref' => 'race-condition-ref']);

        $this->expectException(BulkWriteException::class);
        $this->expectExceptionMessageMatches('/E11000 duplicate key error/');

        Favorite::create(['user_id' => $userId, 'type' => 'food', 'ref' => 'race-condition-ref']);
    }

    // ─── T11: Cross-user isolation on destroy ────────────────────────────────

    public function test_destroy_only_deletes_own_favorite(): void
    {
        $userA = $this->createTestUser();
        $userB = $this->createTestUser();

        Favorite::create(['user_id' => (string) $userA->_id, 'type' => 'food', 'ref' => 'Banana']);

        $response = $this->actingAs($userB, 'sanctum')
            ->deleteJson('/api/favorites', ['type' => 'food', 'ref' => 'Banana']);

        $response->assertStatus(200);

        $this->assertSame(1, Favorite::where('user_id', (string) $userA->_id)
            ->where('type', 'food')->where('ref', 'Banana')->count());
    }
}
