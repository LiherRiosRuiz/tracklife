<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:500',
            'days_per_week' => 'nullable|integer|min:1|max:7',
            'exercises' => 'required|array',
            'exercises.*.exercise_id' => 'required|string',
            'exercises.*.exercise_name' => 'required|string',
            'exercises.*.order' => 'required|integer',
            'exercises.*.sets' => 'required|array|min:1',
            'exercises.*.sets.*.set_number' => 'required|integer',
            'exercises.*.sets.*.type' => 'nullable|string|in:normal,warmup,dropset,failure',
            'exercises.*.sets.*.reps' => 'nullable|integer',
            'exercises.*.sets.*.weight' => 'nullable|numeric',
            'exercises.*.sets.*.rest_seconds' => 'nullable|integer',
        ]);

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

    public function update(Request $request, string $id): JsonResponse
    {
        $plan = WorkoutPlan::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'description' => 'nullable|string|max:500',
            'days_per_week' => 'nullable|integer|min:1|max:7',
            'exercises' => 'sometimes|array',
            'exercises.*.exercise_id' => 'required_with:exercises|string',
            'exercises.*.exercise_name' => 'required_with:exercises|string',
            'exercises.*.order' => 'required_with:exercises|integer',
            'exercises.*.sets' => 'required_with:exercises|array|min:1',
            'exercises.*.sets.*.set_number' => 'required|integer',
            'exercises.*.sets.*.type' => 'nullable|string|in:normal,warmup,dropset,failure',
            'exercises.*.sets.*.reps' => 'nullable|integer',
            'exercises.*.sets.*.weight' => 'nullable|numeric',
            'exercises.*.sets.*.rest_seconds' => 'nullable|integer',
        ]);

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
