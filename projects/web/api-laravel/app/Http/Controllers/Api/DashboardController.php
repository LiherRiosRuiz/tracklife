<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkoutResource;
use App\Models\SocialPost;
use App\Models\Workout;
use App\Services\CoachService;
use App\Services\FeedService;
use App\Services\MacroService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private CoachService $coachService,
        private FeedService $feedService,
        private MacroService $macroService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $macros = $this->macroService->dailyProgress($user, $request->query('date'));

        $feed = $this->feedService->formatPosts(
            SocialPost::orderBy('created_at', 'desc')->limit(5)->get()
        );

        $weeklyCalories = $this->macroService->weeklyCalories($user);

        $recentWorkouts = Workout::where('user_id', (string) $user->_id)
            ->where('date', '>=', Carbon::today()->subDays(7)->startOfDay())
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'user' => [
                'name' => $user->name,
                'streak_days' => $user->streak_days ?? 0,
            ],
            'macros' => $macros,
            'weekly_calories' => $weeklyCalories,
            'recent_workouts' => WorkoutResource::collection($recentWorkouts),
            'insights' => $this->coachService->dailyInsights($user),
            'feed_preview' => $feed,
        ]);
    }
}
