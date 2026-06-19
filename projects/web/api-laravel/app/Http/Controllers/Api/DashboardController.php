<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialPost;
use App\Services\CoachService;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private CoachService $coachService,
        private FeedService $feedService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $macroResponse = app(MacroController::class)->dailyProgress($request);
        $macros = $macroResponse->getData(true);

        $feed = SocialPost::orderBy('created_at', 'desc')->limit(5)->get()
            ->map(fn ($p) => $this->feedService->formatPost($p));

        return response()->json([
            'user' => [
                'name' => $user->name,
                'streak_days' => $user->streak_days ?? 0,
            ],
            'macros' => $macros,
            'insights' => $this->coachService->dailyInsights($user),
            'feed_preview' => $feed,
        ]);
    }
}
