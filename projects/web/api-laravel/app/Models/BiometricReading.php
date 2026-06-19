<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class BiometricReading extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'biometric_readings';

    protected $fillable = [
        'user_id',
        'type',
        'timestamp',
        'value',
        'unit',
        'source',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'value' => 'float',
            'metadata' => 'array',
        ];
    }
}
