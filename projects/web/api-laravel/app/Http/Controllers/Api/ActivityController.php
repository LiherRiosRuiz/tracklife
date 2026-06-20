<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreActivityRequest;
use App\Http\Resources\ActivityResource;
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

        return response()->json(['activities' => ActivityResource::collection($activities)]);
    }

    public function store(StoreActivityRequest $request): JsonResponse
    {
        $data = $request->validated();

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

        return response()->json(['activity' => new ActivityResource($activity)], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $activity = Activity::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        return response()->json(['activity' => new ActivityResource($activity)]);
    }
}
