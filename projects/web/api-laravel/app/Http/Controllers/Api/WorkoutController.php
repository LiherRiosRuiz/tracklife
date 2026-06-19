<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workout;
use App\Models\WorkoutPlan;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkoutController extends Controller
{
    public function __construct(private FeedService $feedService) {}

    public function index(Request $request): JsonResponse
    {
        $workouts = Workout::where('user_id', (string) $request->user()->_id)
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return response()->json(['workouts' => $workouts]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'date' => 'nullable|date',
            'sets' => 'required|array',
            'duration_minutes' => 'nullable|integer',
            'notes' => 'nullable|string',
            'shared_to_feed' => 'nullable|boolean',
        ]);

        $volume = collect($data['sets'])->sum(fn ($s) => (float) ($s['weight'] ?? 0) * (int) ($s['reps'] ?? 0));

        $workout = Workout::create([
            'user_id' => (string) $request->user()->_id,
            'name' => $data['name'],
            'date' => $data['date'] ?? now()->toDateString(),
            'sets' => $data['sets'],
            'total_volume' => $volume,
            'duration_minutes' => $data['duration_minutes'] ?? null,
            'notes' => $data['notes'] ?? null,
            'shared_to_feed' => $data['shared_to_feed'] ?? false,
        ]);

        if ($workout->shared_to_feed) {
            $this->feedService->createPost($request->user(), 'workout_completed', [
                'workout_id' => (string) $workout->_id,
                'name' => $workout->name,
                'total_volume' => $volume,
                'message' => sprintf('completó %s — %.0f kg volumen', $workout->name, $volume),
            ]);
        }

        return response()->json(['workout' => $workout], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $workout = Workout::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        return response()->json(['workout' => $workout]);
    }

    public function fromPlan(Request $request, string $planId): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $planId)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $sets = [];
        foreach ($plan->exercises as $planExercise) {
            foreach ($planExercise['sets'] as $planSet) {
                $sets[] = [
                    'exercise' => $planExercise['exercise_name'],
                    'exercise_id' => $planExercise['exercise_id'],
                    'set_number' => $planSet['set_number'],
                    'type' => $planSet['type'] ?? 'normal',
                    'weight' => $planSet['weight'] ?? 0,
                    'reps' => $planSet['reps'] ?? 0,
                    'rest_seconds' => $planSet['rest_seconds'] ?? 90,
                    'completed' => false,
                ];
            }
        }

        return response()->json([
            'workout' => [
                'name' => $plan->name,
                'plan_id' => (string) $plan->_id,
                'date' => now()->toDateString(),
                'sets' => $sets,
                'duration_minutes' => null,
            ],
        ]);
    }
}
