<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MacroService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MacroController extends Controller
{
    public function __construct(
        private MacroService $macroService,
    ) {}

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

        return response()->json(
            $this->macroService->dailyProgress($user, $date)
        );
    }
}
