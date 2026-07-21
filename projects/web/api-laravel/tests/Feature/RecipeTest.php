<?php

namespace Tests\Feature;

use App\Models\Recipe;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class RecipeTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'recipes', 'social_posts'];

    // ─── Helpers ─────────────────────────────────────────────────────────────

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

    private function createRecipe(array $overrides = []): Recipe
    {
        return Recipe::create(array_merge([
            'user_id' => 'other-user-id',
            'title' => 'Secret Recipe',
            'description' => 'A recipe',
            'ingredients' => [],
            'steps' => [],
            'servings' => 1,
            'is_public' => false,
            'is_premium' => false,
        ], $overrides));
    }

    // ─── T1: Auth guard ──────────────────────────────────────────────────────

    public function test_show_requires_authentication(): void
    {
        $recipe = $this->createRecipe();

        $response = $this->getJson("/api/recipes/{$recipe->_id}");

        $response->assertStatus(401);
    }

    // ─── T2: Show propio (privado) ───────────────────────────────────────────

    public function test_user_can_view_own_private_recipe(): void
    {
        $user = $this->createTestUser();

        $recipe = $this->createRecipe([
            'user_id' => (string) $user->_id,
            'is_public' => false,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/recipes/{$recipe->_id}");

        $response->assertStatus(200)
            ->assertJsonPath('recipe.title', 'Secret Recipe');
    }

    // ─── T3: Show ajeno pero publico ─────────────────────────────────────────

    public function test_user_can_view_any_public_recipe(): void
    {
        $recipe = $this->createRecipe([
            'user_id' => 'other-user-id',
            'is_public' => true,
        ]);

        $response = $this->actingAsTestUser()
            ->getJson("/api/recipes/{$recipe->_id}");

        $response->assertStatus(200)
            ->assertJsonPath('recipe.title', 'Secret Recipe');
    }

    // ─── T4: Show ajeno y privado -> 404 (IDOR) ──────────────────────────────

    public function test_user_cannot_view_another_users_private_recipe(): void
    {
        $recipe = $this->createRecipe([
            'user_id' => 'other-user-id',
            'is_public' => false,
        ]);

        $response = $this->actingAsTestUser()
            ->getJson("/api/recipes/{$recipe->_id}");

        $response->assertStatus(404);
    }
}
