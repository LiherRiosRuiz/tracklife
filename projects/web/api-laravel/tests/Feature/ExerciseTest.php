<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class ExerciseTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['exercises', 'users', 'personal_access_tokens'];

    public function test_exercise_has_extended_fields(): void
    {
        $exercise = Exercise::create([
            'name' => 'Barbell Bench Press',
            'muscle_group' => 'chest',
            'equipment' => 'barbell',
            'category' => 'strength',
            'is_custom' => false,
            'instructions' => [
                'Lie on a flat bench with your feet on the floor.',
                'Grip the bar slightly wider than shoulder width.',
                'Lower the bar to your mid-chest.',
                'Press the bar back up to full arm extension.',
            ],
            'tips' => ['Keep your back flat on the bench.'],
            'image_url' => 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
            'muscles_primary' => ['chest'],
            'muscles_secondary' => ['shoulders', 'triceps'],
        ]);

        $found = Exercise::find($exercise->_id);

        $this->assertNotNull($found);
        $this->assertSame('Barbell Bench Press', $found->name);
        $this->assertSame('strength', $found->category);
        $this->assertIsArray($found->instructions);
        $this->assertCount(4, $found->instructions);
        $this->assertIsArray($found->muscles_primary);
        $this->assertContains('chest', $found->muscles_primary);
        $this->assertIsArray($found->muscles_secondary);
        $this->assertStringContainsString('raw.githubusercontent.com', $found->image_url);
    }

    public function test_exercise_index_filters_by_muscle_group(): void
    {
        Exercise::create(['name' => 'Bench Press', 'muscle_group' => 'chest', 'equipment' => 'barbell', 'is_custom' => false, 'category' => 'strength']);
        Exercise::create(['name' => 'Squat', 'muscle_group' => 'quadriceps', 'equipment' => 'barbell', 'is_custom' => false, 'category' => 'strength']);

        $response = $this->actingAsTestUser()
            ->getJson('/api/exercises?muscle_group=chest');

        $response->assertOk();
        $exercises = $response->json('exercises');
        $this->assertCount(1, $exercises);
        $this->assertSame('Bench Press', $exercises[0]['name']);
    }

    public function test_exercise_index_searches_by_name(): void
    {
        Exercise::create(['name' => 'Barbell Bench Press', 'muscle_group' => 'chest', 'equipment' => 'barbell', 'is_custom' => false, 'category' => 'strength']);
        Exercise::create(['name' => 'Dumbbell Fly', 'muscle_group' => 'chest', 'equipment' => 'dumbbell', 'is_custom' => false, 'category' => 'strength']);

        $response = $this->actingAsTestUser()
            ->getJson('/api/exercises?q=bench');

        $response->assertOk();
        $exercises = $response->json('exercises');
        $this->assertCount(1, $exercises);
    }

    public function test_exercise_show_returns_full_detail(): void
    {
        $exercise = Exercise::create([
            'name' => 'Deadlift',
            'muscle_group' => 'lower_back',
            'equipment' => 'barbell',
            'is_custom' => false,
            'category' => 'strength',
            'instructions' => ['Stand with feet hip-width apart.', 'Grip the bar.', 'Lift by extending hips and knees.'],
            'image_url' => 'https://example.com/deadlift.jpg',
            'muscles_primary' => ['lower_back'],
            'muscles_secondary' => ['glutes', 'hamstrings'],
        ]);

        $response = $this->actingAsTestUser()
            ->getJson("/api/exercises/{$exercise->_id}");

        $response->assertOk()
            ->assertJsonPath('exercise.name', 'Deadlift')
            ->assertJsonPath('exercise.category', 'strength');

        $this->assertIsArray($response->json('exercise.instructions'));
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
