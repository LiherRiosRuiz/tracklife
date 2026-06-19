<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Club extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'clubs';

    protected $fillable = [
        'name',
        'description',
        'owner_id',
        'member_ids',
        'is_public',
        'cover_url',
    ];

    protected function casts(): array
    {
        return [
            'member_ids' => 'array',
            'is_public' => 'boolean',
        ];
    }
}
