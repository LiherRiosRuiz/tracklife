<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiometricReading;
use App\Models\WearableConnection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WearableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $connections = WearableConnection::where('user_id', (string) $request->user()->_id)->get();

        return response()->json(['connections' => $connections]);
    }

    public function connect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => 'required|in:zepp,whoop,garmin,apple_health,strava',
        ]);

        $connection = WearableConnection::updateOrCreate(
            [
                'user_id' => (string) $request->user()->_id,
                'provider' => $data['provider'],
            ],
            [
                'status' => 'connected',
                'last_sync_at' => now(),
                'metadata' => ['mode' => 'demo'],
            ]
        );

        return response()->json(['connection' => $connection]);
    }

    public function sync(Request $request, string $provider): JsonResponse
    {
        $connection = WearableConnection::where('user_id', (string) $request->user()->_id)
            ->where('provider', $provider)
            ->firstOrFail();

        $userId = (string) $request->user()->_id;
        $now = now();

        $demoReadings = [
            ['type' => 'steps', 'value' => rand(6000, 12000), 'unit' => 'steps'],
            ['type' => 'resting_hr', 'value' => rand(52, 68), 'unit' => 'bpm'],
            ['type' => 'sleep_score', 'value' => rand(65, 95), 'unit' => '%'],
            ['type' => 'hrv', 'value' => rand(35, 85), 'unit' => 'ms'],
            ['type' => 'recovery_score', 'value' => rand(40, 95), 'unit' => '%'],
            ['type' => 'strain', 'value' => rand(5, 18), 'unit' => 'score'],
        ];

        foreach ($demoReadings as $reading) {
            BiometricReading::create([
                'user_id' => $userId,
                'type' => $reading['type'],
                'value' => $reading['value'],
                'unit' => $reading['unit'],
                'timestamp' => $now,
                'source' => $provider,
            ]);
        }

        $connection->last_sync_at = $now;
        $connection->save();

        return response()->json([
            'message' => 'Sincronización completada',
            'readings_imported' => count($demoReadings),
        ]);
    }
}
