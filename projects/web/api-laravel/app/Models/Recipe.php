<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Recipe extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'recipes';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'ingredients',
        'steps',
        'servings',
        'totals_per_serving',
        'image_url',
        'is_public',
        'is_premium',
        'price',
    ];

    protected function casts(): array
    {
        return [
            'ingredients' => 'array',
            'steps' => 'array',
            'totals_per_serving' => 'array',
            'is_public' => 'boolean',
            'is_premium' => 'boolean',
            'price' => 'float',
        ];
    }
}
