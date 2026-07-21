<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class ClubTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'clubs'];

    private function actingAsTestUser(): static
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test-'.uniqid().'@test.com',
            'username' => 'testuser'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        return $this->actingAs($user, 'sanctum');
    }

    public function test_club_store_rejects_description_over_500_chars(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/clubs', [
                'name' => 'Test Club',
                'description' => str_repeat('a', 501),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    public function test_club_store_accepts_description_at_500_chars(): void
    {
        $response = $this->actingAsTestUser()
            ->postJson('/api/clubs', [
                'name' => 'Test Club',
                'description' => str_repeat('a', 500),
            ]);

        $response->assertStatus(201);
    }
}
