<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use MongoDB\Laravel\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $connection = 'mongodb';

    protected $collection = 'users';

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'bio',
        'avatar_url',
        'transformation_goal',
        'macro_targets',
        'privacy_settings',
        'streak_days',
        'last_meal_log_date',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'transformation_goal' => 'array',
            'macro_targets' => 'array',
            'privacy_settings' => 'array',
            'streak_days' => 'integer',
            'last_meal_log_date' => 'date',
            // Consent records. Deliberately absent from $fillable: they are
            // written with forceFill() in AuthController::register so that no
            // mass-assignment path can ever accept a client-supplied consent
            // timestamp. A consent record the user can backdate is worse than
            // none — it looks like proof.
            'terms_accepted_at' => 'datetime',
            'health_data_consent_at' => 'datetime',
        ];
    }

    public static function defaultMacroTargets(): array
    {
        return [
            'calories' => 2200,
            'protein' => 150,
            'carbs' => 220,
            'fat' => 70,
        ];
    }

    public static function defaultPrivacySettings(): array
    {
        return [
            'meals' => 'followers',
            'product_scans' => 'public',
            'progress_photos' => 'private',
            'biometrics' => 'private',
            'workouts' => 'followers',
        ];
    }
}
