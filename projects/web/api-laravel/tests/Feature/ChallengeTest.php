<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class ChallengeTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['challenges', 'users', 'personal_access_tokens'];

    public function test_challenge_index_returns_challenges_ordered_by_start_date(): void
    {
        Challenge::create([
            'title' => 'Older Challenge',
            'description' => 'desc',
            'type' => 'steps',
            'start_date' => now()->subDays(10),
            'end_date' => now()->subDays(3),
            'is_active' => true,
        ]);

        Challenge::create([
            'title' => 'Newer Challenge',
            'description' => 'desc',
            'type' => 'steps',
            'start_date' => now()->subDay(),
            'end_date' => now()->addDays(5),
            'is_active' => true,
        ]);

        $response = $this->actingAsTestUser()
            ->getJson('/api/challenges');

        $response->assertOk();
        $challenges = $response->json('challenges');
        $this->assertCount(2, $challenges);
        $this->assertSame('Newer Challenge', $challenges[0]['title']);
    }

    public function test_challenge_index_does_not_exceed_limit(): void
    {
        for ($i = 0; $i < 60; $i++) {
            Challenge::create([
                'title' => sprintf('Challenge %03d', $i),
                'description' => 'desc',
                'type' => 'steps',
                'start_date' => now()->subDays($i),
                'end_date' => now()->addDays(30 - $i),
                'is_active' => true,
            ]);
        }

        $response = $this->actingAsTestUser()
            ->getJson('/api/challenges');

        $response->assertOk();
        $challenges = $response->json('challenges');
        $this->assertLessThanOrEqual(50, count($challenges));
    }

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
}
