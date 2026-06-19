<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Challenge extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'challenges';

    protected $fillable = [
        'title',
        'description',
        'type',
        'start_date',
        'end_date',
        'participant_ids',
        'leaderboard',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'participant_ids' => 'array',
            'leaderboard' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
