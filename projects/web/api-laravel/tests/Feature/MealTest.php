<?php

namespace Tests\Feature;

use App\Models\MealEntry;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class MealTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'meal_entries'];

    // ─── Helper ──────────────────────────────────────────────────────────────

    private function makeUser(string $suffix = 'a'): User
    {
        return User::create([
            'name' => "Test User {$suffix}",
            'email' => "meal{$suffix}@test.com",
            'username' => "mealuser{$suffix}",
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);
    }

    private function mealPayload(array $overrides = []): array
    {
        return array_merge([
            'meal_type' => 'lunch',
            'items' => [
                [
                    'name' => 'Arroz',
                    'quantity' => 200,
                    'unit' => 'g',
                    'calories' => 260,
                    'protein' => 5,
                    'carbs' => 54,
                    'fat' => 1,
                ],
                [
                    'name' => 'Pollo',
                    'quantity' => 150,
                    'unit' => 'g',
                    'calories' => 165,
                    'protein' => 31,
                    'carbs' => 0,
                    'fat' => 3.6,
                ],
            ],
        ], $overrides);
    }

    // ─── Store ───────────────────────────────────────────────────────────────

    public function test_user_can_create_meal_with_items(): void
    {
        $user = $this->makeUser('store1');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $response->assertStatus(201)
            ->assertJsonStructure([
                'meal' => ['id', 'meal_type', 'items', 'totals'],
            ]);

        // Totals calculados correctamente (suma de ítems)
        $totals = $response->json('meal.totals');
        $this->assertSame(425.0, (float) $totals['calories']); // 260 + 165
        $this->assertSame(36.0, (float) $totals['protein']);  // 5 + 31
        $this->assertSame(54.0, (float) $totals['carbs']);    // 54 + 0
        $this->assertSame(4.6, (float) $totals['fat']);      // 1 + 3.6
    }

    public function test_meal_store_fails_without_required_fields(): void
    {
        $user = $this->makeUser('store2');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['meal_type', 'items']);
    }

    public function test_meal_store_rejects_item_name_over_120_chars(): void
    {
        $user = $this->makeUser('storeitemname1');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload([
                'items' => [
                    ['name' => str_repeat('a', 121), 'quantity' => 100, 'unit' => 'g'],
                ],
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.name']);
    }

    public function test_meal_store_accepts_item_name_at_120_chars(): void
    {
        $user = $this->makeUser('storeitemname2');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload([
                'items' => [
                    ['name' => str_repeat('a', 120), 'quantity' => 100, 'unit' => 'g'],
                ],
            ]));

        $response->assertStatus(201);
    }

    public function test_meal_store_rejects_item_unit_over_50_chars(): void
    {
        $user = $this->makeUser('storeitemunit1');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload([
                'items' => [
                    ['name' => 'Arroz', 'quantity' => 100, 'unit' => str_repeat('a', 51)],
                ],
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.unit']);
    }

    public function test_meal_store_rejects_photo_url_over_2048_chars(): void
    {
        $user = $this->makeUser('storephotourl1');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload([
                'photo_url' => 'https://example.com/'.str_repeat('a', 2048),
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo_url']);
    }

    public function test_meal_store_rejects_notes_over_500_chars(): void
    {
        $user = $this->makeUser('storenotes1');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload([
                'notes' => str_repeat('a', 501),
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }

    public function test_meal_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/meals', $this->mealPayload());

        $response->assertStatus(401);
    }

    // ─── Index ───────────────────────────────────────────────────────────────

    public function test_user_can_list_their_meals(): void
    {
        $userA = $this->makeUser('listA');
        $userB = $this->makeUser('listB');

        // Crear una comida para userA y otra para userB
        $this->actingAs($userA, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $this->actingAs($userB, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        // userA solo ve su propia comida
        $response = $this->actingAs($userA, 'sanctum')
            ->getJson('/api/meals');

        $response->assertStatus(200)
            ->assertJsonStructure(['meals']);

        $meals = $response->json('meals');
        $this->assertCount(1, $meals);
        // MealResource no expone user_id — verificamos aislamiento por conteo
        $this->assertArrayHasKey('id', $meals[0]);
        $this->assertArrayNotHasKey('user_id', $meals[0]);
    }

    public function test_meals_can_be_filtered_by_date(): void
    {
        $user = $this->makeUser('filter');

        // Crear comida de hoy
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload(['date' => '2026-06-19']));

        // Crear comida de ayer (via payload con fecha)
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload(['date' => '2026-06-18']));

        // Filtrar por 2026-06-19: solo 1 resultado
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/meals?date=2026-06-19');

        $response->assertStatus(200);
        $meals = $response->json('meals');
        $this->assertCount(1, $meals);
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    public function test_user_can_update_their_meal(): void
    {
        $user = $this->makeUser('update');

        $createResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $mealId = $createResponse->json('meal.id');

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/meals/{$mealId}", [
                'meal_type' => 'dinner',
                'notes' => 'Cena actualizada',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('meal.meal_type', 'dinner')
            ->assertJsonPath('meal.notes', 'Cena actualizada');
    }

    public function test_meal_update_rejects_notes_over_500_chars(): void
    {
        $user = $this->makeUser('updnotes');

        $createResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $mealId = $createResponse->json('meal.id');

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/meals/{$mealId}", [
                'notes' => str_repeat('a', 501),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }

    public function test_meal_update_rejects_photo_url_over_2048_chars(): void
    {
        $user = $this->makeUser('updphotourl');

        $createResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $mealId = $createResponse->json('meal.id');

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/meals/{$mealId}", [
                'photo_url' => 'https://example.com/'.str_repeat('a', 2048),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo_url']);
    }

    public function test_user_cannot_update_another_users_meal(): void
    {
        $userA = $this->makeUser('updA');
        $userB = $this->makeUser('updB');

        $createResponse = $this->actingAs($userA, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $mealId = $createResponse->json('meal.id');

        // userB intenta actualizar la comida de userA → 404 (firstOrFail scoped)
        $response = $this->actingAs($userB, 'sanctum')
            ->putJson("/api/meals/{$mealId}", ['meal_type' => 'dinner']);

        $response->assertStatus(404);
    }

    // ─── Delete ──────────────────────────────────────────────────────────────

    public function test_user_can_delete_their_meal(): void
    {
        $user = $this->makeUser('del');

        $createResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $mealId = $createResponse->json('meal.id');

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/meals/{$mealId}");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Comida eliminada');

        $this->assertNull(MealEntry::find($mealId));
    }

    public function test_user_cannot_delete_another_users_meal(): void
    {
        $userA = $this->makeUser('delA');
        $userB = $this->makeUser('delB');

        $createResponse = $this->actingAs($userA, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        $mealId = $createResponse->json('meal.id');

        // userB intenta borrar la comida de userA → 404 (firstOrFail scoped)
        $response = $this->actingAs($userB, 'sanctum')
            ->deleteJson("/api/meals/{$mealId}");

        $response->assertStatus(404);
    }

    // ─── Streak ──────────────────────────────────────────────────────────────

    public function test_creating_meal_updates_user_streak(): void
    {
        $user = $this->makeUser('streak');
        // Usuario nuevo: streak_days = 0, last_meal_log_date = null

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/meals', $this->mealPayload());

        // Re-fetch desde MongoDB para ver el estado actualizado por StreakService
        $fresh = User::find($user->_id);

        // Sin meal previo → streak sube a 1
        $this->assertSame(1, $fresh->streak_days);
        $this->assertNotNull($fresh->last_meal_log_date);
    }
}
