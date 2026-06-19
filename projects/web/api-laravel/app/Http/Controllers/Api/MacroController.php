<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MealEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MacroController extends Controller
{
    public function targets(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'targets' => $user->macro_targets ?? User::defaultMacroTargets(),
        ]);
    }

    public function updateTargets(Request $request): JsonResponse
    {
        $data = $request->validate([
            'calories' => 'required|numeric|min:800|max:10000',
            'protein' => 'required|numeric|min:0|max:500',
            'carbs' => 'required|numeric|min:0|max:1000',
            'fat' => 'required|numeric|min:0|max:500',
        ]);

        $user = $request->user();
        $user->macro_targets = $data;
        $user->save();

        return response()->json(['targets' => $user->macro_targets]);
    }

    public function dailyProgress(Request $request): JsonResponse
    {
        $date = $request->query('date', Carbon::today()->toDateString());
        $user = $request->user();

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

        return response()->json([
            'date' => $date,
            'consumed' => array_map(fn ($v) => round($v, 1), $consumed),
            'targets' => $targets,
            'streak_days' => $user->streak_days ?? 0,
        ]);
    }
}
