<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class WorkoutPlan extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'workout_plans';

    protected $fillable = ['user_id', 'name', 'description', 'days_per_week', 'exercises', 'is_public'];

    protected function casts(): array
    {
        return [
            'exercises' => 'array',
            'days_per_week' => 'integer',
            'is_public' => 'boolean',
        ];
    }
}
