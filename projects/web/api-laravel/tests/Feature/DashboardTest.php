<?php

namespace Tests\Feature;

use App\Models\MealEntry;
use App\Models\SocialPost;
use App\Models\User;
use App\Models\Workout;
use Carbon\Carbon;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class DashboardTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'meal_entries', 'workouts', 'social_posts'];

    private function makeUser(): User
    {
        $user = User::create([
            'name' => 'Test',
            'email' => 'dash@test.com',
            'password' => bcrypt('password'),
            'username' => 'dashtest',
        ]);

        return $user;
    }

    public function test_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }

    public function test_dashboard_returns_expected_structure(): void
    {
        $user = $this->makeUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'user',
                'macros',
                'weekly_calories',
                'recent_workouts',
                'insights',
                'feed_preview',
            ]);
    }

    public function test_dashboard_weekly_calories_returns_7_days(): void
    {
        $user = $this->makeUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard');

        $response->assertOk();
        $this->assertCount(7, $response->json('weekly_calories'));
    }

    public function test_dashboard_weekly_calories_includes_meal_data(): void
    {
        $user = $this->makeUser();

        MealEntry::create([
            'user_id' => (string) $user->_id,
            'date' => Carbon::today()->subDays(2)->toDateString(),
            'meal_type' => 'lunch',
            'items' => [['name' => 'Test', 'calories' => 400]],
            'totals' => ['calories' => 400, 'protein' => 30, 'carbs' => 50, 'fat' => 10],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard');

        $response->assertOk();
        $weekly = collect($response->json('weekly_calories'));
        $day = $weekly->firstWhere('date', Carbon::today()->subDays(2)->toDateString());
        $this->assertNotNull($day);
        $this->assertSame(400.0, (float) $day['calories']);
    }

    public function test_dashboard_recent_workouts_uses_resource(): void
    {
        $user = $this->makeUser();

        Workout::create([
            'user_id' => (string) $user->_id,
            'name' => 'Push Day',
            'date' => Carbon::today()->toDateString(),
            'sets' => [],
            'total_volume' => 1500,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard');

        $response->assertOk();
        $workouts = $response->json('recent_workouts');
        $this->assertCount(1, $workouts);
        $this->assertSame('Push Day', $workouts[0]['name']);
        $this->assertArrayHasKey('id', $workouts[0]);
        $this->assertArrayNotHasKey('user_id', $workouts[0]);
    }

    public function test_dashboard_feed_preview_attaches_correct_author_per_post(): void
    {
        $user = $this->makeUser();

        $otherUser = User::create([
            'name' => 'Other',
            'email' => 'other@test.com',
            'password' => bcrypt('password'),
            'username' => 'otheruser',
        ]);

        SocialPost::create([
            'user_id' => (string) $user->_id,
            'type' => 'workout_completed',
            'payload' => ['message' => 'from owner'],
            'kudos_count' => 0,
            'kudos_user_ids' => [],
            'comments' => [],
        ]);

        SocialPost::create([
            'user_id' => (string) $otherUser->_id,
            'type' => 'meal_logged',
            'payload' => ['message' => 'from other'],
            'kudos_count' => 0,
            'kudos_user_ids' => [],
            'comments' => [],
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/dashboard');

        $response->assertOk();
        $feed = $response->json('feed_preview');

        $this->assertCount(2, $feed);

        $postFromOwner = collect($feed)->firstWhere('payload.message', 'from owner');
        $postFromOther = collect($feed)->firstWhere('payload.message', 'from other');

        $this->assertNotNull($postFromOwner);
        $this->assertNotNull($postFromOther);
        $this->assertSame((string) $user->_id, $postFromOwner['user']['id']);
        $this->assertSame($user->username, $postFromOwner['user']['username']);
        $this->assertSame((string) $otherUser->_id, $postFromOther['user']['id']);
        $this->assertSame($otherUser->username, $postFromOther['user']['username']);
    }
}
