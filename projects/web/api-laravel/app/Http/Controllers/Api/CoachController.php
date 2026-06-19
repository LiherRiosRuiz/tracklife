<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CoachService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoachController extends Controller
{
    public function __construct(private CoachService $coachService) {}

    public function daily(Request $request): JsonResponse
    {
        return response()->json([
            'insights' => $this->coachService->dailyInsights($request->user()),
        ]);
    }
}
