<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;

class StreakService
{
    public function updateForMealLog(User $user): void
    {
        $today = Carbon::today();
        $last = $user->last_meal_log_date ? Carbon::parse($user->last_meal_log_date) : null;

        if ($last && $last->isSameDay($today)) {
            return;
        }

        if ($last && $last->diffInDays($today) === 1) {
            $user->streak_days = ($user->streak_days ?? 0) + 1;
        } else {
            $user->streak_days = 1;
        }

        $user->last_meal_log_date = $today->toDateString();
        $user->save();
    }
}
