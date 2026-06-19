<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use MongoDB\BSON\Regex;

class ExerciseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Exercise::where(function ($q) use ($request) {
            $q->where('is_custom', false)
                ->orWhere('user_id', (string) $request->user()->_id);
        });

        if ($request->filled('muscle_group')) {
            $query->where('muscle_group', $request->input('muscle_group'));
        }

        if ($request->filled('equipment')) {
            $query->where('equipment', $request->input('equipment'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where('name', 'regex', new Regex($search, 'i'));
        }

        $exercises = $query->orderBy('name')->get();

        return response()->json(['exercises' => $exercises]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $exercise = Exercise::where('_id', $id)
            ->where(function ($q) use ($request) {
                $q->where('is_custom', false)
                    ->orWhere('user_id', (string) $request->user()->_id);
            })
            ->firstOrFail();

        return response()->json(['exercise' => $exercise]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'muscle_group' => 'nullable|string',
            'equipment' => 'nullable|string',
            'category' => 'nullable|string',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string',
            'tips' => 'nullable|array',
            'tips.*' => 'string',
        ]);

        $exercise = Exercise::create(array_merge($data, [
            'user_id' => (string) $request->user()->_id,
            'is_custom' => true,
        ]));

        return response()->json(['exercise' => $exercise], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $exercise = Exercise::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->where('is_custom', true)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'muscle_group' => 'nullable|string',
            'equipment' => 'nullable|string',
            'category' => 'nullable|string',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string',
            'tips' => 'nullable|array',
            'tips.*' => 'string',
        ]);

        $exercise->update($data);

        return response()->json(['exercise' => $exercise]);
    }
}
