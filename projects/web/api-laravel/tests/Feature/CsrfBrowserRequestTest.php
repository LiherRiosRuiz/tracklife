<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

/**
 * Regression test for the real-browser 419 "CSRF token mismatch" bug.
 *
 * Root cause: SANCTUM_STATEFUL_DOMAINS (config/sanctum.php) has always
 * included `app.tracklife.test` (see .env.example since the very first
 * commit). Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful
 * ::fromFrontend() decides "statefulness" purely by comparing the request's
 * Origin/Referer header host against that config list — it does NOT check
 * whether any cookie is present. Because the frontend's origin is in that
 * list, every mutating request coming from a real browser (which always
 * sends Origin/Referer) got the EncryptCookies+StartSession+VerifyCsrfToken
 * middleware group appended by statefulApi(), and VerifyCsrfToken rejects
 * any request without a matching CSRF token — regardless of the fact that
 * the request is already authenticated via a valid Sanctum Bearer token.
 * `curl` requests never send Origin/Referer, so fromFrontend() is false for
 * them and they skip this middleware entirely, which is why curl "worked"
 * while the real browser didn't.
 *
 * This app has no cookie/session-based login anywhere (AuthController only
 * ever calls createToken(), never Auth::login()); so CSRF protection (which
 * only exists to protect cookie-authenticated requests) has nothing to
 * protect here. The fix removes $middleware->statefulApi() from
 * bootstrap/app.php entirely instead of teaching the frontend the SPA
 * cookie/CSRF dance, since nothing in this codebase relies on cookie-based
 * auth.
 */
class CsrfBrowserRequestTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens', 'favorites'];

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

    public function test_authenticated_post_from_real_browser_origin_does_not_get_419(): void
    {
        $user = $this->createTestUser();

        // Simulates a real browser request: Origin header present (like every
        // browser fetch()/XHR sends), no X-XSRF-TOKEN, no CSRF cookie dance —
        // exactly what web3-next's request() wrapper sends today.
        $response = $this->actingAs($user, 'sanctum')
            ->withHeaders(['Origin' => 'https://app.tracklife.test'])
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => 'Milanesa con pure']);

        $response->assertStatus(201);
    }

    public function test_authenticated_post_from_other_stateful_origin_does_not_get_419(): void
    {
        $user = $this->createTestUser();

        // tracklife.test is also in SANCTUM_STATEFUL_DOMAINS — same guarantee.
        $response = $this->actingAs($user, 'sanctum')
            ->withHeaders(['Origin' => 'https://tracklife.test'])
            ->postJson('/api/favorites', ['type' => 'food', 'ref' => 'Milanesa con pure']);

        $response->assertStatus(201);
    }
}
