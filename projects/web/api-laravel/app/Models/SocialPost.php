<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class SocialPost extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'social_posts';

    protected $fillable = [
        'user_id',
        'type',
        'payload',
        'kudos_count',
        'kudos_user_ids',
        'comments',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'kudos_count' => 'integer',
            'kudos_user_ids' => 'array',
            'comments' => 'array',
        ];
    }
}
