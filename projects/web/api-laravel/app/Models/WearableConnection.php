<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

/**
 * Current sync() is mock/demo only — no real OAuth token is stored anywhere in this model.
 * When real wearable OAuth is wired in (see roadmap), any access/refresh token field added
 * here MUST use Laravel's `encrypted` cast (or a dedicated secrets store) — never store it
 * as a plain string/array field. `metadata` is intentionally generic today; do not repurpose
 * it to hold tokens without adding that protection first.
 */
class WearableConnection extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'wearable_connections';

    protected $fillable = [
        'user_id',
        'provider',
        'status',
        'last_sync_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'last_sync_at' => 'datetime',
            'metadata' => 'array',
        ];
    }
}
