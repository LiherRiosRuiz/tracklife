<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiometricReading;
use App\Services\FeedService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiometricController extends Controller
{
    public function __construct(private FeedService $feedService) {}

    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $days = (int) $request->query('days', 7);

        $query = BiometricReading::where('user_id', (string) $request->user()->_id)
            ->where('timestamp', '>=', Carbon::now()->subDays($days));

        if ($type) {
            $query->where('type', $type);
        }

        $readings = $query->orderBy('timestamp', 'desc')->get();

        return response()->json(['readings' => $readings]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:sleep_score,hrv,resting_hr,recovery_score,strain,steps,weight,body_fat,muscle_mass,spO2',
            'value' => 'required|numeric',
            'unit' => 'nullable|string',
            'timestamp' => 'nullable|date',
            'source' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        $reading = BiometricReading::create([
            'user_id' => (string) $request->user()->_id,
            'type' => $data['type'],
            'value' => $data['value'],
            'unit' => $data['unit'] ?? null,
            'timestamp' => $data['timestamp'] ?? now(),
            'source' => $data['source'] ?? 'manual',
            'metadata' => $data['metadata'] ?? [],
        ]);

        if ($data['type'] === 'recovery_score' && $data['value'] >= 80) {
            $this->feedService->createPost($request->user(), 'recovery_milestone', [
                'value' => $data['value'],
                'message' => 'alcanzó recuperación verde',
            ]);
        }

        return response()->json(['reading' => $reading], 201);
    }

    public function today(Request $request): JsonResponse
    {
        $userId = (string) $request->user()->_id;
        $types = ['recovery_score', 'strain', 'sleep_score', 'hrv', 'resting_hr'];
        $summary = [];

        foreach ($types as $type) {
            $latest = BiometricReading::where('user_id', $userId)
                ->where('type', $type)
                ->orderBy('timestamp', 'desc')
                ->first();
            $summary[$type] = $latest ? [
                'value' => $latest->value,
                'unit' => $latest->unit,
                'timestamp' => $latest->timestamp?->toIso8601String(),
            ] : null;
        }

        return response()->json(['summary' => $summary]);
    }
}
