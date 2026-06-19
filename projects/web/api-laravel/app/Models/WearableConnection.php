<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

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
