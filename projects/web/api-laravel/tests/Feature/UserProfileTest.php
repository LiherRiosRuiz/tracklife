<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class UserProfileTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens'];

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Default User',
            'email' => 'default-' . uniqid() . '@test.com',
            'username' => 'defaultuser' . uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ], $overrides));
    }

    public function test_returns_200_with_full_profile_structure(): void
    {
        $me = $this->createUser();
        $target = $this->createUser([
            'name' => 'Target User',
            'username' => 'targetuser',
            'email' => 'target@test.com',
            'bio' => null,
            'avatar_url' => null,
            'streak_days' => 0,
        ]);

        $response = $this->actingAs($me, 'sanctum')
            ->getJson('/api/users/' . $target->_id . '/profile');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'username', 'bio', 'avatar_url', 'streak_days'],
            ]);
    }

    public function test_returns_401_if_not_authenticated(): void
    {
        $target = $this->createUser();

        $response = $this->getJson('/api/users/' . $target->_id . '/profile');

        $response->assertStatus(401);
    }

    public function test_returns_404_if_user_does_not_exist(): void
    {
        $me = $this->createUser();

        // ID bien formado (24 hex) pero inexistente
        $nonExistentId = '507f1f77bcf86cd799439011';

        $response = $this->actingAs($me, 'sanctum')
            ->getJson('/api/users/' . $nonExistentId . '/profile');

        $response->assertStatus(404);
    }

    public function test_does_not_expose_sensitive_fields(): void
    {
        $me = $this->createUser();
        $target = $this->createUser([
            'email' => 'sensitive@test.com',
        ]);

        $response = $this->actingAs($me, 'sanctum')
            ->getJson('/api/users/' . $target->_id . '/profile');

        $response->assertStatus(200);

        $user = $response->json('user');
        $this->assertArrayNotHasKey('email',    $user);
        $this->assertArrayNotHasKey('password', $user);
        $this->assertArrayNotHasKey('macro_targets',    $user);
        $this->assertArrayNotHasKey('privacy_settings', $user);
    }

    public function test_returns_correct_values_for_known_user(): void
    {
        $me = $this->createUser();
        $target = $this->createUser([
            'name' => 'Known User',
            'username' => 'knownuser',
            'email' => 'known@test.com',
            'bio' => 'Fitness enthusiast',
            'avatar_url' => 'https://example.com/avatar.jpg',
            'streak_days' => 7,
        ]);

        $response = $this->actingAs($me, 'sanctum')
            ->getJson('/api/users/' . $target->_id . '/profile');

        $response->assertStatus(200)
            ->assertJsonPath('user.id',          (string) $target->_id)
            ->assertJsonPath('user.name',        'Known User')
            ->assertJsonPath('user.username',    'knownuser')
            ->assertJsonPath('user.bio',         'Fitness enthusiast')
            ->assertJsonPath('user.avatar_url',  'https://example.com/avatar.jpg')
            ->assertJsonPath('user.streak_days', 7);
    }

    public function test_update_rejects_avatar_url_over_2048_chars(): void
    {
        $user = $this->createUser();

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', [
                'avatar_url' => 'https://example.com/'.str_repeat('a', 2048),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['avatar_url']);
    }
}