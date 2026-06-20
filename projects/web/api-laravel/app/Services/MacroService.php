<?php

namespace App\Services;

use App\Models\MealEntry;
use App\Models\User;
use Carbon\Carbon;

class MacroService
{
    public function dailyProgress(User $user, string|null $date = null): array
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
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = \Carbon\Carbon::today()->subDays($i)->toDateString();
            $meals = \App\Models\MealEntry::where('user_id', (string) $user->_id)
                ->whereDate('date', $date)
                ->get();

            $total = 0;
            foreach ($meals as $meal) {
                $total += (float) ($meal->totals['calories'] ?? 0);
            }

            $days[] = [
                'date'     => $date,
                'day'      => \Carbon\Carbon::parse($date)->locale('es')->isoFormat('ddd'),
                'calories' => round($total, 1),
            ];
        }

        return $days;
    }
}
