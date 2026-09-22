<?php

namespace App\Support;

/**
 * Versions of the legal texts a user consents to at registration.
 *
 * Stored alongside each consent timestamp so that, when a policy changes, it is
 * possible to tell who agreed to which wording — GDPR art. 7(1) requires being
 * able to DEMONSTRATE consent, and "true" demonstrates nothing.
 *
 * Dates rather than integers: self-describing, and it is literally what a
 * regulator asks for. The landing renders the same strings from
 * web1-astro/src/config/legal.ts. Two deployables, so the match cannot be
 * enforced at build time — the privacy page displays its version precisely so a
 * drift is visible rather than silent.
 *
 * Bump these when the corresponding text changes materially.
 */
final class LegalVersions
{
    public const TERMS = '2026-09-22';

    public const PRIVACY = '2026-09-22';
}
