<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\Club;
use App\Models\Recipe;
use App\Models\User;
use App\Models\WorkoutPlan;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

/**
 * Locks both halves of the API response contract.
 *
 * Hiding internal fields is the easy half. The half that actually breaks things
 * is the other one: every field the frontend renders must still be present. A
 * Resource that quietly drops `description` or renames `member_ids` to nothing
 * passes a "no user_id leaked" assertion and still blanks the UI.
 */
class ResourceShapeTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'clubs', 'challenges', 'recipes', 'workout_plans'];

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

    public function test_club_exposes_a_member_count_and_never_the_member_list(): void
    {
        $user = $this->createTestUser();
        $other = $this->createTestUser();
        Club::create([
            'name' => 'Club de prueba',
            'description' => 'Descripción',
            'owner_id' => (string) $user->_id,
            'member_ids' => [(string) $user->_id, (string) $other->_id],
            'is_public' => true,
        ]);

        $club = $this->actingAs($user)->getJson('/api/clubs')->assertOk()->json('clubs.0');

        // member_ids let any viewer enumerate the full membership of every club,
        // and was only ever used to render a count.
        $this->assertArrayNotHasKey('member_ids', $club);
        $this->assertArrayNotHasKey('owner_id', $club);
        // What the UI actually needs:
        $this->assertSame(2, $club['members_count']);
        $this->assertSame('Club de prueba', $club['name']);
        $this->assertSame('Descripción', $club['description']);
        $this->assertTrue($club['is_member']);
    }

    public function test_challenge_exposes_a_participant_count_and_never_the_participant_list(): void
    {
        $user = $this->createTestUser();
        Challenge::create([
            'title' => 'Reto de prueba',
            'description' => 'Descripción',
            'type' => 'streak',
            'participant_ids' => [(string) $user->_id],
            'is_active' => true,
        ]);

        $challenge = $this->actingAs($user)->getJson('/api/challenges')->assertOk()->json('challenges.0');

        $this->assertArrayNotHasKey('participant_ids', $challenge);
        // leaderboard holds user identifiers and nothing reads it yet.
        $this->assertArrayNotHasKey('leaderboard', $challenge);
        $this->assertSame(1, $challenge['participants_count']);
        $this->assertSame('Reto de prueba', $challenge['title']);
        $this->assertSame('Descripción', $challenge['description']);
        $this->assertTrue($challenge['is_participant']);
    }

    public function test_recipe_keeps_the_fields_the_ui_renders_and_drops_ownership_and_pricing(): void
    {
        $user = $this->createTestUser();
        Recipe::create([
            'user_id' => (string) $user->_id,
            'title' => 'Tortilla',
            'description' => 'Con patata',
            'ingredients' => ['huevos', 'patata'],
            'steps' => ['batir', 'freír'],
            'servings' => 2,
            'is_public' => true,
            'is_premium' => true,
            'price' => 9.99,
        ]);

        $recipe = $this->actingAs($user)->getJson('/api/recipes')->assertOk()->json('recipes.0');

        $this->assertArrayNotHasKey('user_id', $recipe);
        $this->assertArrayNotHasKey('is_premium', $recipe);
        $this->assertArrayNotHasKey('price', $recipe);
        // The old Resource emitted `instructions` (a field Recipe does not have,
        // so always null) and omitted `description`, which recetas/page.tsx renders.
        $this->assertArrayNotHasKey('instructions', $recipe);
        $this->assertSame('Con patata', $recipe['description']);
        $this->assertSame(['batir', 'freír'], $recipe['steps']);
        $this->assertSame('Tortilla', $recipe['title']);
    }

    public function test_workout_plan_keeps_the_fields_the_ui_renders_and_drops_user_id(): void
    {
        $user = $this->createTestUser();
        WorkoutPlan::create([
            'user_id' => (string) $user->_id,
            'name' => 'Push Day',
            'description' => 'Empuje',
            'days_per_week' => 4,
            'exercises' => [['exercise_id' => 'e1', 'exercise_name' => 'Press', 'order' => 1, 'sets' => []]],
            'is_public' => false,
        ]);

        $plan = $this->actingAs($user)->getJson('/api/workout-plans')->assertOk()->json('plans.0');

        $this->assertArrayNotHasKey('user_id', $plan);
        // planes/page.tsx, planes/[id] and the coach plan section all read these.
        $this->assertSame('Push Day', $plan['name']);
        $this->assertSame('Empuje', $plan['description']);
        $this->assertSame(4, $plan['days_per_week']);
        $this->assertCount(1, $plan['exercises']);
    }
}
