<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\User;
use App\Models\Workout;
use App\Models\WorkoutPlan;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class WorkoutPlanTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['workout_plans', 'exercises', 'users', 'personal_access_tokens', 'workouts'];

    public function test_can_create_workout_plan(): void
    {
        $exercise = Exercise::create([
            'name' => 'Bench Press',
            'muscle_group' => 'chest',
            'equipment' => 'barbell',
            'is_custom' => false,
            'category' => 'strength',
        ]);

        $response = $this->actingAsTestUser()->postJson('/api/workout-plans', [
            'name' => 'Push Day',
            'description' => 'Chest, shoulders and triceps',
            'exercises' => [
                [
                    'exercise_id' => (string) $exercise->_id,
                    'exercise_name' => 'Bench Press',
                    'order' => 1,
                    'sets' => [
                        ['set_number' => 1, 'type' => 'normal', 'reps' => 10, 'weight' => 60, 'rest_seconds' => 90],
                        ['set_number' => 2, 'type' => 'normal', 'reps' => 10, 'weight' => 60, 'rest_seconds' => 90],
                        ['set_number' => 3, 'type' => 'normal', 'reps' => 8, 'weight' => 65, 'rest_seconds' => 120],
                    ],
                ],
            ],
        ]);

        $response->assertCreated();
        $this->assertSame('Push Day', $response->json('plan.name'));
        $this->assertCount(1, $response->json('plan.exercises'));
        $this->assertCount(3, $response->json('plan.exercises.0.sets'));
    }

    public function test_can_list_own_plans(): void
    {
        $user = $this->createTestUser();

        WorkoutPlan::create(['user_id' => (string) $user->_id, 'name' => 'Plan A', 'exercises' => []]);
        WorkoutPlan::create(['user_id' => (string) $user->_id, 'name' => 'Plan B', 'exercises' => []]);
        WorkoutPlan::create(['user_id' => 'other-user-id', 'name' => 'Plan C', 'exercises' => []]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/workout-plans');

        $response->assertOk();
        $this->assertCount(2, $response->json('plans'));
    }

    public function test_can_show_own_plan(): void
    {
        $user = $this->createTestUser();
        $plan = WorkoutPlan::create(['user_id' => (string) $user->_id, 'name' => 'My Plan', 'exercises' => []]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/workout-plans/{$plan->_id}");

        $response->assertOk()->assertJsonPath('plan.name', 'My Plan');
    }

    public function test_cannot_show_other_users_plan(): void
    {
        $plan = WorkoutPlan::create(['user_id' => 'other-user-id', 'name' => 'Secret Plan', 'exercises' => []]);

        $response = $this->actingAsTestUser()->getJson("/api/workout-plans/{$plan->_id}");

        $response->assertNotFound();
    }

    public function test_can_update_own_plan(): void
    {
        $user = $this->createTestUser();
        $plan = WorkoutPlan::create(['user_id' => (string) $user->_id, 'name' => 'Old Name', 'exercises' => []]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/workout-plans/{$plan->_id}", ['name' => 'New Name', 'description' => 'Updated description']);

        $response->assertOk()->assertJsonPath('plan.name', 'New Name');
    }

    public function test_can_delete_own_plan(): void
    {
        $user = $this->createTestUser();
        $plan = WorkoutPlan::create(['user_id' => (string) $user->_id, 'name' => 'To Delete', 'exercises' => []]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/workout-plans/{$plan->_id}");

        $response->assertOk();
        $this->assertNull(WorkoutPlan::find($plan->_id));
    }

    public function test_from_plan_returns_prefilled_workout_without_persisting(): void
    {
        $user = $this->createTestUser();

        $exercise = Exercise::create([
            'name' => 'Squat',
            'muscle_group' => 'quadriceps',
            'equipment' => 'barbell',
            'is_custom' => false,
            'category' => 'strength',
        ]);

        $plan = WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'Leg Day',
            'exercises' => [
                [
                    'exercise_id' => (string) $exercise->_id,
                    'exercise_name' => 'Squat',
                    'order' => 1,
                    'sets' => [
                        ['set_number' => 1, 'type' => 'normal', 'reps' => 10, 'weight' => 80, 'rest_seconds' => 120],
                    ],
                ],
            ],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/workouts/from-plan/{$plan->_id}");

        $response->assertOk();
        $workout = $response->json('workout');
        $this->assertSame('Leg Day', $workout['name']);
        $this->assertCount(1, $workout['sets']);
        $this->assertSame('Squat', $workout['sets'][0]['exercise']);
        $this->assertSame(80, $workout['sets'][0]['weight']);
        $this->assertArrayHasKey('rest_seconds', $workout['sets'][0]);
        $this->assertFalse($workout['sets'][0]['completed']);

        // Verify nothing was persisted
        $this->assertSame(0, Workout::where('user_id', (string) $user->_id)->count());
    }

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
}
