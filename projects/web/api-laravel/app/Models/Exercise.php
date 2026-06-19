<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Exercise extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'exercises';

    protected $fillable = [
        'name',
        'muscle_group',
        'equipment',
        'category',
        'is_custom',
        'user_id',
        'instructions',
        'tips',
        'image_url',
        'muscles_primary',
        'muscles_secondary',
        'force',
        'level',
        'mechanic',
        'external_id',
    ];

    protected function casts(): array
    {
        return [
            'is_custom' => 'boolean',
            'instructions' => 'array',
            'tips' => 'array',
            'muscles_primary' => 'array',
            'muscles_secondary' => 'array',
        ];
    }
}
