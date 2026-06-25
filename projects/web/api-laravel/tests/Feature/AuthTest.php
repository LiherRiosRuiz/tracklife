<?php

namespace Tests\Feature;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

class AuthTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens'];

    // ─── Register ────────────────────────────────────────────────────────────

    public function test_user_can_register_successfully(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'register@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'username', 'email'],
                'token',
            ]);

        $this->assertNotEmpty($response->json('token'));
        $this->assertSame('register@test.com', $response->json('user.email'));
    }

    public function test_register_fails_with_duplicate_email(): void
    {
        User::create([
            'name' => 'Existing User',
            'email' => 'duplicate@test.com',
            'username' => 'existinguser',
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'duplicate@test.com',
            'password' => 'password123',
        ]);

        // AuthController throws ValidationException for duplicate email → 422
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_fails_without_required_fields(): void
    {
        $response = $this->postJson('/api/auth/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    public function test_user_can_login_with_valid_credentials(): void
    {
        User::create([
            'name' => 'Login User',
            'email' => 'login@test.com',
            'username' => 'loginuser',
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'username', 'email'],
                'token',
            ]);

        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::create([
            'name' => 'Wrong Pass User',
            'email' => 'wrongpass@test.com',
            'username' => 'wrongpassuser',
            'password' => 'correctpassword',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'wrongpass@test.com',
            'password' => 'wrongpassword',
        ]);

        // AuthController throws ValidationException → 422 with error on 'email'
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_with_nonexistent_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nobody@test.com',
            'password' => 'password123',
        ]);

        // AuthController throws ValidationException → 422 with error on 'email'
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // ─── Me (ruta autenticada) ───────────────────────────────────────────────

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::create([
            'name' => 'Me User',
            'email' => 'me@test.com',
            'username' => 'meuser',
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('user.email', 'me@test.com')
            ->assertJsonPath('user.username', 'meuser')
            ->assertJsonStructure(['user' => ['id', 'name', 'username', 'email']]);
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    // ─── Logout ──────────────────────────────────────────────────────────────

    public function test_logout_revokes_token_on_server(): void
    {
        $user = User::create([
            'name' => 'Logout User',
            'email' => 'logout@test.com',
            'username' => 'logoutuser',
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        // Mint a real token (no TransientToken — real DB token)
        $plainToken = $user->createToken('tracklife')->plainTextToken;

        // Logout usando el token real como Bearer header
        $logoutResponse = $this->withToken($plainToken)
            ->postJson('/api/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJsonPath('message', 'Sesión cerrada');

        // Verificar que el token fue eliminado de MongoDB (revocación real)
        $this->assertSame(0, PersonalAccessToken::count());

        // Simular boundary de proceso: el guard cachea el usuario en memoria durante
        // el request de logout. forgetGuards() fuerza re-resolución del token desde
        // MongoDB en la siguiente petición (igual que ocurre en producción donde
        // cada request es un proceso independiente).
        $this->app['auth']->forgetGuards();

        // El token ya no debe funcionar para /api/auth/me
        $meResponse = $this->withToken($plainToken)
            ->getJson('/api/auth/me');

        $meResponse->assertStatus(401);
    }

    // ─── Register adicionales (T10-T14) ──────────────────────────────────────

    public function test_register_fails_with_short_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Short Pass User',
            'email' => 'shortpass@test.com',
            'password' => 'short', // 5 caracteres — mínimo es 8
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_register_fails_with_invalid_email_format(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Bad Email User',
            'email' => 'not-an-email',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_without_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_register_auto_generates_username_from_email(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'John Doe',
            'email' => 'johndoe@test.com',
            'password' => 'password123',
            // sin username
        ]);

        $response->assertStatus(201);
        $this->assertSame('johndoe', $response->json('user.username'));
    }

    public function test_register_appends_suffix_on_duplicate_username(): void
    {
        // Crear usuario con username 'johndoe' primero
        User::create([
            'name' => 'Existing John',
            'email' => 'johndoe-existing@test.com',
            'username' => 'johndoe',
            'password' => 'password123',
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        // Registrar otro usuario cuyo email generaría el mismo username 'johndoe'
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Another John',
            'email' => 'johndoe@other.com',
            'password' => 'password123',
            // sin username → generaría 'johndoe' → colisión → sufijo
        ]);

        $response->assertStatus(201);

        $username = $response->json('user.username');
        $this->assertNotSame('johndoe', $username);
        $this->assertStringStartsWith('johndoe-', $username);
    }
}
