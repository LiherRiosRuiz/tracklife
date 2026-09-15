<?php

namespace Tests\Feature;

use App\Models\SocialPost;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

/**
 * POST /api/feed used to accept all seven feed types plus a free-form payload
 * array, so any authenticated client could publish a workout_completed carrying
 * an arbitrary volume with no workout behind it — metrics in the feed that no
 * record could back. It is now restricted to plain status updates.
 */
class FeedPostSpoofingTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'social_posts', 'follows'];

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

    public function test_a_client_cannot_publish_a_fabricated_workout_post(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user)
            ->postJson('/api/feed', [
                'type' => 'workout_completed',
                'payload' => ['message' => 'Entrené', 'total_volume' => 99999],
            ])
            ->assertStatus(422);

        $this->assertSame(0, SocialPost::count());
    }

    public function test_every_server_generated_type_is_rejected_from_the_client(): void
    {
        $user = $this->createTestUser();

        foreach (['meal_logged', 'recipe_shared', 'product_scanned', 'challenge_joined', 'recovery_milestone', 'cardio_activity'] as $type) {
            $this->actingAs($user)
                ->postJson('/api/feed', ['type' => $type, 'payload' => ['message' => 'x']])
                ->assertStatus(422);
        }

        $this->assertSame(0, SocialPost::count());
    }

    public function test_a_plain_status_update_is_accepted(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user)
            ->postJson('/api/feed', [
                'type' => 'status_update',
                'payload' => ['message' => 'Volviendo al gimnasio tras la lesión'],
            ])
            ->assertCreated();

        $this->assertSame(1, SocialPost::count());
        $this->assertSame('status_update', SocialPost::first()->type);
    }

    public function test_extra_payload_keys_are_stripped_rather_than_stored(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user)
            ->postJson('/api/feed', [
                'type' => 'status_update',
                'payload' => ['message' => 'Hola', 'total_volume' => 99999, 'calories' => 5000],
            ])
            ->assertCreated();

        // Validation alone would let unexpected keys through into storage, where
        // a later renderer might surface them as if they were measured.
        $this->assertSame(['message' => 'Hola'], SocialPost::first()->payload);
    }

    public function test_a_status_update_requires_a_message(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user)
            ->postJson('/api/feed', ['type' => 'status_update', 'payload' => []])
            ->assertStatus(422);

        $this->actingAs($user)
            ->postJson('/api/feed', ['type' => 'status_update', 'payload' => ['message' => str_repeat('a', 501)]])
            ->assertStatus(422);

        $this->assertSame(0, SocialPost::count());
    }
}
