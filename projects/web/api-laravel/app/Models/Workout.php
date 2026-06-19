<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Workout extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'workouts';

    protected $fillable = [
        'user_id',
        'name',
        'date',
        'sets',
        'total_volume',
        'duration_minutes',
        'notes',
        'shared_to_feed',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'sets' => 'array',
            'total_volume' => 'float',
            'duration_minutes' => 'integer',
            'shared_to_feed' => 'boolean',
        ];
    }
}
