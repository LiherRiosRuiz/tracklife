<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\BiometricReading;
use App\Models\MealEntry;
use App\Models\User;
use App\Models\Workout;
use Carbon\Carbon;

class CoachService
{
    public function dailyInsights(User $user): array
    {
        $today = Carbon::today();
        $insights = [];

        $meals = MealEntry::where('user_id', (string) $user->_id)
            ->whereDate('date', $today)
            ->get();

        $totals = ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0];
        foreach ($meals as $meal) {
            foreach (['calories', 'protein', 'carbs', 'fat'] as $key) {
                $totals[$key] += (float) ($meal->totals[$key] ?? 0);
            }
        }

        $targets = $user->macro_targets ?? User::defaultMacroTargets();

        if ($totals['protein'] < ($targets['protein'] ?? 150) * 0.6) {
            $remaining = (int) (($targets['protein'] ?? 150) - $totals['protein']);
            $insights[] = [
                'type' => 'nutrition',
                'severity' => 'warning',
                'message' => "Te faltan ~{$remaining}g de proteína hoy.",
            ];
        }

        $lastWorkout = Workout::where('user_id', (string) $user->_id)
            ->orderBy('date', 'desc')
            ->first();

        if (! $lastWorkout || Carbon::parse($lastWorkout->date)->diffInDays($today) >= 3) {
            $insights[] = [
                'type' => 'training',
                'severity' => 'info',
                'message' => 'Llevas 3+ días sin registrar entrenamiento de fuerza.',
            ];
        }

        $lastCardio = Activity::where('user_id', (string) $user->_id)
            ->orderBy('date', 'desc')
            ->first();

        if (! $lastCardio || Carbon::parse($lastCardio->date)->diffInDays($today) >= 5) {
            $insights[] = [
                'type' => 'cardio',
                'severity' => 'info',
                'message' => 'Considera añadir actividad cardio esta semana.',
            ];
        }

        $recovery = BiometricReading::where('user_id', (string) $user->_id)
            ->where('type', 'recovery_score')
            ->orderBy('timestamp', 'desc')
            ->first();

        if ($recovery && $recovery->value < 50) {
            $insights[] = [
                'type' => 'recovery',
                'severity' => 'warning',
                'message' => 'Recuperación baja: prioriza sueño y nutrición hoy.',
            ];
        }

        if (empty($insights)) {
            $insights[] = [
                'type' => 'general',
                'severity' => 'success',
                'message' => 'Buen ritmo. Sigue registrando para mantener tu racha.',
            ];
        }

        return $insights;
    }
}
