<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Activity extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'activities';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'date',
        'duration_minutes',
        'distance_km',
        'calories',
        'avg_heart_rate',
        'route',
        'elevation_gain',
        'notes',
        'source',
        'shared_to_feed',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'datetime',
            'duration_minutes' => 'integer',
            'distance_km' => 'float',
            'calories' => 'integer',
            'avg_heart_rate' => 'integer',
            'route' => 'array',
            'elevation_gain' => 'float',
            'shared_to_feed' => 'boolean',
        ];
    }
}
