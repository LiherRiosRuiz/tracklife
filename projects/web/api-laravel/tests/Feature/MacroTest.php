<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class MacroTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'meal_entries'];

    // ─── Helper ──────────────────────────────────────────────────────────────

    private function makeUser(string $suffix = 'a'): User
    {
        return User::create([
            'name' => "Macro User {$suffix}",
            'email' => "macro{$suffix}@test.com",
            'username' => "macrouser{$suffix}",
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);
    }

    // ─── Targets ─────────────────────────────────────────────────────────────

    public function test_user_can_get_their_macro_targets(): void
    {
        $user = $this->makeUser('get');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/macros/targets');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'targets' => ['calories', 'protein', 'carbs', 'fat'],
            ]);

        // Usuario nuevo tiene los targets por defecto
        $defaults = User::defaultMacroTargets();
        $targets = $response->json('targets');

        $this->assertSame((int) $defaults['calories'], (int) $targets['calories']);
        $this->assertSame((int) $defaults['protein'], (int) $targets['protein']);
        $this->assertSame((int) $defaults['carbs'], (int) $targets['carbs']);
        $this->assertSame((int) $defaults['fat'], (int) $targets['fat']);
    }

    public function test_user_can_update_macro_targets(): void
    {
        $user = $this->makeUser('upd');

        $newTargets = [
            'calories' => 2500,
            'protein' => 180,
            'carbs' => 250,
            'fat' => 80,
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/macros/targets', $newTargets);

        $response->assertStatus(200)
            ->assertJsonPath('targets.calories', 2500)
            ->assertJsonPath('targets.protein', 180)
            ->assertJsonPath('targets.carbs', 250)
            ->assertJsonPath('targets.fat', 80);

        // Verificar que persiste en MongoDB
        $fresh = User::find($user->_id);
        $this->assertSame(2500, (int) $fresh->macro_targets['calories']);
    }

    public function test_update_macro_targets_fails_with_invalid_values(): void
    {
        $user = $this->makeUser('inv');

        // Calorías por debajo del mínimo (800) → 422
        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/macros/targets', [
                'calories' => 100,
                'protein' => 150,
                'carbs' => 200,
                'fat' => 70,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['calories']);
    }

    public function test_macro_targets_require_authentication(): void
    {
        $response = $this->getJson('/api/macros/targets');

        $response->assertStatus(401);
    }

    // ─── Daily Progress ───────────────────────────────────────────────────────

    public function test_daily_progress_is_zero_without_meals(): void
    {
        $user = $this->makeUser('zero');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/macros/progress');

        $response->assertStatus(200)
            ->assertJsonStructure(['date', 'consumed', 'targets', 'streak_days']);

        $consumed = $response->json('consumed');
        $this->assertSame(0, (int) $consumed['calories']);
        $this->assertSame(0, (int) $consumed['protein']);
        $this->assertSame(0, (int) $consumed['carbs']);
        $this->assertSame(0, (int) $consumed['fat']);
    }

    public function test_daily_progress_reflects_logged_meals(): void
    {
        $user = $this->makeUser('prog');
        $today = now()->toDateString();

        // Crear comida via endpoint (para que calculateTotals del controller genere los totals)
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', [
                'meal_type' => 'breakfast',
                'date' => $today,
                'items' => [
                    [
                        'name' => 'Avena',
                        'quantity' => 100,
                        'unit' => 'g',
                        'calories' => 350,
                        'protein' => 12,
                        'carbs' => 60,
                        'fat' => 7,
                    ],
                ],
            ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/macros/progress?date={$today}");

        $response->assertStatus(200);

        $consumed = $response->json('consumed');
        $this->assertSame(350.0, (float) $consumed['calories']);
        $this->assertSame(12.0, (float) $consumed['protein']);
        $this->assertSame(60.0, (float) $consumed['carbs']);
        $this->assertSame(7.0, (float) $consumed['fat']);
    }

    public function test_daily_progress_requires_authentication(): void
    {
        $response = $this->getJson('/api/macros/progress');

        $response->assertStatus(401);
    }
}
