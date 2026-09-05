<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SearchFoodRequest;
use App\Services\OpenFoodFactsService;
use Illuminate\Http\JsonResponse;

class FoodController extends Controller
{
    public function __construct(private OpenFoodFactsService $offService) {}

    public function search(SearchFoodRequest $request): JsonResponse
    {
        $query = $request->validated()['q'];

        return response()->json(['foods' => $this->offService->searchFoods($query)]);
    }
}
