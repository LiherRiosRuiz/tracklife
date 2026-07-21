<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class ProductTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'products'];

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

    // ─── Scan: barcode length validation ────────────────────────────────────

    public function test_product_scan_rejects_barcode_over_50_chars(): void
    {
        $response = $this->actingAsTestUser()->postJson('/api/products/scan', [
            'barcode' => str_repeat('1', 51),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['barcode']);
    }

    public function test_product_scan_accepts_known_barcode_at_50_chars(): void
    {
        $barcode = str_repeat('1', 50);

        Product::create([
            'barcode' => $barcode,
            'name' => 'Test Product',
            'health_score' => 80,
        ]);

        $response = $this->actingAsTestUser()->postJson('/api/products/scan', [
            'barcode' => $barcode,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('product.barcode', $barcode);
    }

    public function test_product_scan_requires_authentication(): void
    {
        $response = $this->postJson('/api/products/scan', [
            'barcode' => '1234567890123',
        ]);

        $response->assertStatus(401);
    }
}
