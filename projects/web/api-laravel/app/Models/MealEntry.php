<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class MealEntry extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'meal_entries';

    protected $fillable = [
        'user_id',
        'date',
        'meal_type',
        'items',
        'totals',
        'photo_url',
        'notes',
        'shared_to_feed',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'items' => 'array',
            'totals' => 'array',
            'shared_to_feed' => 'boolean',
        ];
    }
}
