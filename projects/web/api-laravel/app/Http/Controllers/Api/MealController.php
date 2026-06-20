<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMealRequest;
use App\Http\Requests\UpdateMealRequest;
use App\Http\Resources\MealResource;
use App\Models\MealEntry;
use App\Services\FeedService;
use App\Services\StreakService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MealController extends Controller
{
    public function __construct(
        private StreakService $streakService,
        private FeedService $feedService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $date = $request->query('date', Carbon::today()->toDateString());

        $meals = MealEntry::where('user_id', (string) $request->user()->_id)
            ->whereDate('date', $date)
            ->orderBy('created_at')
            ->get();

        return response()->json(['meals' => MealResource::collection($meals)]);
    }

    public function store(StoreMealRequest $request): JsonResponse
    {
        $data = $request->validated();

        $totals = $this->calculateTotals($data['items']);

        $meal = MealEntry::create([
            'user_id' => (string) $request->user()->_id,
            'date' => $data['date'] ?? Carbon::today()->toDateString(),
            'meal_type' => $data['meal_type'],
            'items' => $data['items'],
            'totals' => $totals,
            'photo_url' => $data['photo_url'] ?? null,
            'notes' => $data['notes'] ?? null,
            'shared_to_feed' => $data['shared_to_feed'] ?? false,
        ]);

        $this->streakService->updateForMealLog($request->user());

        if ($meal->shared_to_feed) {
            $this->feedService->createPost($request->user(), 'meal_logged', [
                'meal_id' => (string) $meal->_id,
                'meal_type' => $meal->meal_type,
                'totals' => $totals,
                'message' => sprintf(
                    'registró %s: %d kcal, P%.0f/C%.0f/G%.0f',
                    $meal->meal_type,
                    $totals['calories'],
                    $totals['protein'],
                    $totals['carbs'],
                    $totals['fat']
                ),
            ]);
        }

        return response()->json(['meal' => new MealResource($meal)], 201);
    }

    public function update(UpdateMealRequest $request, string $id): JsonResponse
    {
        $meal = MealEntry::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $data = $request->validated();

        if (isset($data['items'])) {
            $data['totals'] = $this->calculateTotals($data['items']);
        }

        $meal->update($data);

        return response()->json(['meal' => new MealResource($meal->fresh())]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $meal = MealEntry::where('_id', $id)
            ->where('user_id', (string) $request->user()->_id)
            ->firstOrFail();

        $meal->delete();

        return response()->json(['message' => 'Comida eliminada']);
    }

    private function calculateTotals(array $items): array
    {
        $totals = ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0];

        foreach ($items as $item) {
            $totals['calories'] += (float) ($item['calories'] ?? 0);
            $totals['protein'] += (float) ($item['protein'] ?? 0);
            $totals['carbs'] += (float) ($item['carbs'] ?? 0);
            $totals['fat'] += (float) ($item['fat'] ?? 0);
        }

        return array_map(fn ($v) => round($v, 1), $totals);
    }
}
