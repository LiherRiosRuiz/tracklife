<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Product extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'products';

    protected $fillable = [
        'barcode',
        'name',
        'brand',
        'image_url',
        'nutriments',
        'ingredients',
        'health_score',
        'alerts',
        'nova_group',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'nutriments' => 'array',
            'alerts' => 'array',
            'health_score' => 'integer',
            'nova_group' => 'integer',
        ];
    }
}
