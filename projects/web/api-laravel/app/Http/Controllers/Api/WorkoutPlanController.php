<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWorkoutPlanRequest;
use App\Http\Requests\UpdateWorkoutPlanRequest;
use App\Models\WorkoutPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkoutPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $plans = WorkoutPlan::where('user_id', (string) $request->user()->_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['plans' => $plans]);
    }

    public function store(StoreWorkoutPlanRequest $request): JsonResponse
    {
        $data = $request->validated();

        $plan = WorkoutPlan::create([
            'user_id' => (string) $request->user()->_id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'days_per_week' => $data['days_per_week'] ?? null,
            'exercises' => $data['exercises'],
            'is_public' => false,
        ]);

        return response()->json(['plan' => $plan], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        return response()->json(['plan' => $plan]);
    }

    public function update(UpdateWorkoutPlanRequest $request, string $id): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $data = $request->validated();

        $plan->update($data);

        return response()->json(['plan' => $plan->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();
        $plan->delete();

        return response()->json(['message' => 'Plan eliminado']);
    }
}
