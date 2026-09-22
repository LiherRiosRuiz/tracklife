<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\LegalVersions;
use Tests\TestCase;
use Tests\Traits\MongoTestCleanup;

/**
 * TrackLife stores GDPR art. 9 special-category health data (weight, body fat,
 * resting HR, HRV, sleep, recovery, SpO2). That needs EXPLICIT consent, separate
 * from the contractual basis covering the terms — one bundled checkbox is the
 * pattern the EDPB specifically calls invalid.
 *
 * Art. 7(1) additionally requires being able to DEMONSTRATE consent, which is
 * why the model stores server-generated timestamps plus the version of the text
 * agreed to, rather than a boolean.
 */
class ConsentCaptureTest extends TestCase
{
    use MongoTestCleanup;

    protected array $mongoCollections = ['users', 'personal_access_tokens'];

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test User',
            'email' => 'consent-'.uniqid().'@test.com',
            'password' => 'password123',
            'accept_terms' => true,
            'accept_health_data' => true,
        ], $overrides);
    }

    public function test_register_fails_when_consent_is_missing(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'nc-'.uniqid().'@test.com',
            'password' => 'password123',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['accept_terms', 'accept_health_data']);

        $this->assertSame(0, User::count());
    }

    public function test_register_fails_when_consent_is_explicitly_false(): void
    {
        // Distinct from "missing": `required` alone would let a false value
        // through in some shapes. This pins the `accepted` rule.
        $this->postJson('/api/auth/register', $this->validPayload([
            'accept_terms' => false,
            'accept_health_data' => false,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['accept_terms', 'accept_health_data']);

        $this->assertSame(0, User::count());
    }

    public function test_health_data_consent_is_required_separately_from_the_terms(): void
    {
        // Accepting the terms must NOT imply consent to process health data.
        $this->postJson('/api/auth/register', $this->validPayload([
            'accept_health_data' => false,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['accept_health_data']);

        $this->assertSame(0, User::count());
    }

    public function test_register_records_server_side_timestamps_and_versions(): void
    {
        $email = 'ok-'.uniqid().'@test.com';

        $this->postJson('/api/auth/register', $this->validPayload(['email' => $email]))
            ->assertStatus(201);

        $user = User::where('email', $email)->first();

        $this->assertNotNull($user->terms_accepted_at);
        $this->assertNotNull($user->health_data_consent_at);
        $this->assertSame(LegalVersions::TERMS, $user->terms_version);
        $this->assertSame(LegalVersions::PRIVACY, $user->health_data_consent_version);
    }

    public function test_a_client_cannot_forge_the_consent_timestamp(): void
    {
        // The whole reason these fields are kept out of $fillable. A consent
        // record the user can backdate is worse than none: it looks like proof.
        $email = 'forge-'.uniqid().'@test.com';

        $this->postJson('/api/auth/register', $this->validPayload([
            'email' => $email,
            'terms_accepted_at' => '2000-01-01T00:00:00Z',
            'health_data_consent_at' => '2000-01-01T00:00:00Z',
            'terms_version' => 'forjada',
        ]))->assertStatus(201);

        $user = User::where('email', $email)->first();

        $this->assertTrue($user->terms_accepted_at->isAfter(now()->subMinute()));
        $this->assertTrue($user->health_data_consent_at->isAfter(now()->subMinute()));
        $this->assertSame(LegalVersions::TERMS, $user->terms_version);
    }
}
