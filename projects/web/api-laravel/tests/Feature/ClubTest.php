<?php

namespace Tests\Feature;

use App\Models\Club;
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

    public function test_show_requires_authentication(): void
    {
        $club = Club::create([
            'name' => 'Private Club',
            'owner_id' => 'some-owner-id',
            'member_ids' => [],
            'is_public' => false,
        ]);

        $response = $this->getJson('/api/clubs/'.$club->_id);

        $response->assertStatus(401);
    }

    public function test_owner_can_view_own_private_club(): void
    {
        $owner = User::create([
            'name' => 'Owner User',
            'email' => 'owner-'.uniqid().'@test.com',
            'username' => 'owner'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $club = Club::create([
            'name' => 'Private Club',
            'owner_id' => (string) $owner->_id,
            'member_ids' => [(string) $owner->_id],
            'is_public' => false,
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clubs/'.$club->_id);

        $response->assertStatus(200)
            ->assertJsonPath('club.name', 'Private Club');
    }

    public function test_member_can_view_private_club_they_belong_to(): void
    {
        $owner = User::create([
            'name' => 'Owner User',
            'email' => 'owner-'.uniqid().'@test.com',
            'username' => 'owner'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $member = User::create([
            'name' => 'Member User',
            'email' => 'member-'.uniqid().'@test.com',
            'username' => 'member'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $club = Club::create([
            'name' => 'Private Club',
            'owner_id' => (string) $owner->_id,
            'member_ids' => [(string) $owner->_id, (string) $member->_id],
            'is_public' => false,
        ]);

        $response = $this->actingAs($member, 'sanctum')
            ->getJson('/api/clubs/'.$club->_id);

        $response->assertStatus(200)
            ->assertJsonPath('club.name', 'Private Club');
    }

    public function test_non_member_cannot_view_private_club(): void
    {
        $owner = User::create([
            'name' => 'Owner User',
            'email' => 'owner-'.uniqid().'@test.com',
            'username' => 'owner'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $club = Club::create([
            'name' => 'Private Club',
            'owner_id' => (string) $owner->_id,
            'member_ids' => [(string) $owner->_id],
            'is_public' => false,
        ]);

        $response = $this->actingAsTestUser()
            ->getJson('/api/clubs/'.$club->_id);

        $response->assertStatus(404);
    }

    public function test_any_authenticated_user_can_view_public_club(): void
    {
        $owner = User::create([
            'name' => 'Owner User',
            'email' => 'owner-'.uniqid().'@test.com',
            'username' => 'owner'.uniqid(),
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $club = Club::create([
            'name' => 'Public Club',
            'owner_id' => (string) $owner->_id,
            'member_ids' => [(string) $owner->_id],
            'is_public' => true,
        ]);

        $response = $this->actingAsTestUser()
            ->getJson('/api/clubs/'.$club->_id);

        $response->assertStatus(200)
            ->assertJsonPath('club.name', 'Public Club');
    }
}
