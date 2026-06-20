<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMacroTargetsRequest;
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

    public function updateTargets(UpdateMacroTargetsRequest $request): JsonResponse
    {
        $data = $request->validated();

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
