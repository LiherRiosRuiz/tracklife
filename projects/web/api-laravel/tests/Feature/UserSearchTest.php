<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class UserSearchTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens'];

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Default User',
            'email' => 'default-'.uniqid().'@test.com',
            'username' => 'defaultuser'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ], $overrides));
    }

    public function test_search_returns_matching_users(): void
    {
        $me = $this->createUser();
        $this->createUser(['name' => 'Alice Johnson', 'username' => 'alicej', 'email' => 'alice@test.com']);
        $this->createUser(['name' => 'Bob Smith',    'username' => 'bobsmith', 'email' => 'bob@test.com']);

        $response = $this->actingAs($me, 'sanctum')->getJson('/api/users/search?q=Alice');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'users')
            ->assertJsonPath('users.0.username', 'alicej')
            ->assertJsonStructure(['users' => [['id', 'name', 'username', 'avatar_url']]]);

        $this->assertArrayNotHasKey('email', $response->json('users.0'));
        $this->assertArrayNotHasKey('macro_targets', $response->json('users.0'));
        $this->assertArrayNotHasKey('privacy_settings', $response->json('users.0'));
    }

    public function test_search_requires_authentication(): void
    {
        $response = $this->getJson('/api/users/search?q=Alice');
        $response->assertStatus(401);
    }

    public function test_search_with_empty_query_returns_validation_error(): void
    {
        $me = $this->createUser();
        $response = $this->actingAs($me, 'sanctum')->getJson('/api/users/search?q=');
        $response->assertStatus(422)->assertJsonValidationErrors(['q']);
    }

    public function test_search_excludes_authenticated_user(): void
    {
        $me = $this->createUser(['name' => 'Searcher Unique', 'username' => 'searcherunique']);
        $this->createUser(['name' => 'Searcher Other', 'username' => 'searcherother']);

        $response = $this->actingAs($me, 'sanctum')->getJson('/api/users/search?q=Searcher');

        $response->assertStatus(200)->assertJsonCount(1, 'users');
        $this->assertSame('searcherother', $response->json('users.0.username'));
    }

    public function test_search_matches_username_case_insensitive_partial(): void
    {
        $me = $this->createUser();
        $this->createUser(['name' => 'Carlos Ruiz', 'username' => 'CarlosFitness', 'email' => 'carlos@test.com']);

        $response = $this->actingAs($me, 'sanctum')->getJson('/api/users/search?q=carlosfit');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'users')
            ->assertJsonPath('users.0.username', 'CarlosFitness');
    }
}
