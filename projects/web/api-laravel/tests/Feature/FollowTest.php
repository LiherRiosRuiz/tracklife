<?php

namespace Tests\Feature;

use App\Models\Follow;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use MongoDB\Driver\Exception\BulkWriteException;
use MongoDB\Laravel\Schema\Blueprint;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class FollowTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'follows'];

    protected function setUp(): void
    {
        parent::setUp();

        // MongoTestCleanup dropea la colección `follows` completa (con sus
        // índices) en el tearDown de cada test, así que reinstalamos aquí el
        // mismo índice compuesto único que crea la migración
        // 2026_08_29_120000_add_unique_index_to_follows_collection.php.
        // FollowController::store() depende de que este índice exista para
        // detectar duplicados vía excepción en vez de un find-then-insert.
        Schema::connection('mongodb')->table('follows', function (Blueprint $collection) {
            $collection->unique(['follower_id', 'followed_id']);
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

    // ─── Auth guard ──────────────────────────────────────────────────────────

    public function test_requires_authentication(): void
    {
        $target = $this->createTestUser();

        $this->getJson('/api/follows')->assertStatus(401);
        $this->postJson("/api/users/{$target->_id}/follow")->assertStatus(401);
        $this->deleteJson("/api/users/{$target->_id}/follow")->assertStatus(401);
    }

    // ─── Store ───────────────────────────────────────────────────────────────

    public function test_store_creates_follow_returns_201(): void
    {
        $follower = $this->createTestUser();
        $target = $this->createTestUser();

        $response = $this->actingAs($follower, 'sanctum')
            ->postJson("/api/users/{$target->_id}/follow");

        $response->assertStatus(201)
            ->assertJsonPath('following', true);

        $this->assertSame(1, Follow::where('follower_id', (string) $follower->_id)
            ->where('followed_id', (string) $target->_id)->count());
    }

    public function test_store_duplicate_returns_200_and_single_row(): void
    {
        $follower = $this->createTestUser();
        $target = $this->createTestUser();

        $this->actingAs($follower, 'sanctum')
            ->postJson("/api/users/{$target->_id}/follow")
            ->assertStatus(201);

        $response = $this->actingAs($follower, 'sanctum')
            ->postJson("/api/users/{$target->_id}/follow");

        $response->assertStatus(200)
            ->assertJsonPath('following', true);

        $this->assertSame(1, Follow::where('follower_id', (string) $follower->_id)
            ->where('followed_id', (string) $target->_id)->count());
    }

    public function test_store_rejects_self_follow_422(): void
    {
        $user = $this->createTestUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/users/{$user->_id}/follow");

        $response->assertStatus(422);

        $this->assertSame(0, Follow::where('follower_id', (string) $user->_id)->count());
    }

    public function test_store_unknown_user_returns_404(): void
    {
        $follower = $this->createTestUser();

        $response = $this->actingAs($follower, 'sanctum')
            ->postJson('/api/users/000000000000000000000000/follow');

        $response->assertStatus(404);
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────

    public function test_destroy_returns_200_and_removes_row(): void
    {
        $follower = $this->createTestUser();
        $target = $this->createTestUser();

        Follow::create(['follower_id' => (string) $follower->_id, 'followed_id' => (string) $target->_id]);

        $response = $this->actingAs($follower, 'sanctum')
            ->deleteJson("/api/users/{$target->_id}/follow");

        $response->assertStatus(200)
            ->assertJsonPath('following', false);

        $this->assertSame(0, Follow::where('follower_id', (string) $follower->_id)
            ->where('followed_id', (string) $target->_id)->count());
    }

    public function test_destroy_absent_follow_still_returns_200(): void
    {
        $follower = $this->createTestUser();
        $target = $this->createTestUser();

        $response = $this->actingAs($follower, 'sanctum')
            ->deleteJson("/api/users/{$target->_id}/follow");

        $response->assertStatus(200)
            ->assertJsonPath('following', false);
    }

    public function test_destroy_only_removes_own_follow(): void
    {
        $followerA = $this->createTestUser();
        $followerB = $this->createTestUser();
        $target = $this->createTestUser();

        Follow::create(['follower_id' => (string) $followerA->_id, 'followed_id' => (string) $target->_id]);

        $response = $this->actingAs($followerB, 'sanctum')
            ->deleteJson("/api/users/{$target->_id}/follow");

        $response->assertStatus(200);

        $this->assertSame(1, Follow::where('follower_id', (string) $followerA->_id)
            ->where('followed_id', (string) $target->_id)->count());
    }

    // ─── Index ───────────────────────────────────────────────────────────────

    public function test_index_returns_only_callers_following_ids(): void
    {
        $follower = $this->createTestUser();
        $followedB = $this->createTestUser();
        $followedC = $this->createTestUser();
        $otherFollower = $this->createTestUser();
        $unrelatedTarget = $this->createTestUser();

        Follow::create(['follower_id' => (string) $follower->_id, 'followed_id' => (string) $followedB->_id]);
        Follow::create(['follower_id' => (string) $follower->_id, 'followed_id' => (string) $followedC->_id]);
        // Belongs to a different follower — must not leak into the caller's list.
        Follow::create(['follower_id' => (string) $otherFollower->_id, 'followed_id' => (string) $unrelatedTarget->_id]);

        $response = $this->actingAs($follower, 'sanctum')->getJson('/api/follows');

        $response->assertStatus(200);

        $followingIds = $response->json('following_ids');
        $this->assertCount(2, $followingIds);
        $this->assertContains((string) $followedB->_id, $followingIds);
        $this->assertContains((string) $followedC->_id, $followingIds);
    }

    // ─── Uniqueness ──────────────────────────────────────────────────────────

    public function test_unique_index_rejects_duplicate_at_db_level(): void
    {
        // El índice único ya lo instala setUp(); aquí solo lo ejercemos.
        $followerId = (string) $this->createTestUser()->_id;
        $followedId = (string) $this->createTestUser()->_id;

        Follow::create(['follower_id' => $followerId, 'followed_id' => $followedId]);

        $this->expectException(BulkWriteException::class);
        $this->expectExceptionMessageMatches('/E11000 duplicate key error/');

        Follow::create(['follower_id' => $followerId, 'followed_id' => $followedId]);
    }
}
