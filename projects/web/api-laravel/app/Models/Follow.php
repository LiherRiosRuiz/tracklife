<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Follow extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'follows';

    protected $fillable = [
        'follower_id',
        'followed_id',
    ];
}
