<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function __construct(private FeedService $feedService) {}

    public function index(Request $request): JsonResponse
    {
        $activities = Activity::where('user_id', (string) $request->user()->_id)
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return response()->json(['activities' => $activities]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:run,bike,swim,walk,other',
            'title' => 'required|string|max:120',
            'date' => 'nullable|date',
            'duration_minutes' => 'nullable|integer',
            'distance_km' => 'nullable|numeric',
            'calories' => 'nullable|integer',
            'avg_heart_rate' => 'nullable|integer',
            'route' => 'nullable|array',
            'elevation_gain' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'source' => 'nullable|string',
            'shared_to_feed' => 'nullable|boolean',
        ]);

        $activity = Activity::create(array_merge($data, [
            'user_id' => (string) $request->user()->_id,
            'date' => $data['date'] ?? now(),
            'source' => $data['source'] ?? 'manual',
        ]));

        if ($activity->shared_to_feed) {
            $this->feedService->createPost($request->user(), 'cardio_activity', [
                'activity_id' => (string) $activity->_id,
                'title' => $activity->title,
                'distance_km' => $activity->distance_km,
                'duration_minutes' => $activity->duration_minutes,
                'message' => sprintf(
                    '%s%s',
                    $activity->title,
                    $activity->distance_km ? " — {$activity->distance_km} km" : ''
                ),
            ]);
        }

        return response()->json(['activity' => $activity], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $activity = Activity::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        return response()->json(['activity' => $activity]);
    }
}
