<?php

namespace App\Services;

use App\Models\MealEntry;
use App\Models\User;
use Carbon\Carbon;

class MacroService
{
    public function dailyProgress(User $user, ?string $date = null): array
    {
        $date = $date ?? Carbon::today()->toDateString();

        $meals = MealEntry::where('user_id', (string) $user->_id)
            ->whereDate('date', $date)
            ->get();

        $consumed = ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0];
        foreach ($meals as $meal) {
            foreach ($consumed as $key => $val) {
                $consumed[$key] += (float) ($meal->totals[$key] ?? 0);
            }
        }

        $targets = $user->macro_targets ?? User::defaultMacroTargets();

        return [
            'date' => $date,
            'consumed' => array_map(fn ($v) => round($v, 1), $consumed),
            'targets' => $targets,
            'streak_days' => $user->streak_days ?? 0,
        ];
    }

    public function weeklyCalories(User $user): array
    {
        $startDate = Carbon::today()->subDays(6)->startOfDay();
        $endDate = Carbon::today()->endOfDay();

        $meals = MealEntry::where('user_id', (string) $user->_id)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        $caloriesByDate = [];
        foreach ($meals as $meal) {
            $mealDate = $meal->date->toDateString();
            $caloriesByDate[$mealDate] = ($caloriesByDate[$mealDate] ?? 0) + (float) ($meal->totals['calories'] ?? 0);
        }

        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i)->toDateString();

            $days[] = [
                'date' => $date,
                'day' => Carbon::parse($date)->locale('es')->isoFormat('ddd'),
                'calories' => round($caloriesByDate[$date] ?? 0, 1),
            ];
        }

        return $days;
    }
}
