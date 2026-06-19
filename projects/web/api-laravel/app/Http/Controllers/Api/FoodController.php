<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OpenFoodFactsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoodController extends Controller
{
    public function __construct(private OpenFoodFactsService $offService) {}

    public function search(Request $request): JsonResponse
    {
        $query = $request->validate(['q' => 'required|string|min:2'])['q'];

        return response()->json(['foods' => $this->offService->searchFoods($query)]);
    }
}
