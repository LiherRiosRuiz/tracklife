<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFavoriteRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['favorites' => []]);
    }

    public function store(StoreFavoriteRequest $request): JsonResponse
    {
        return response()->json(['favorite' => []], 201);
    }

    public function destroy(StoreFavoriteRequest $request): JsonResponse
    {
        return response()->json(['message' => 'Favorito eliminado']);
    }
}
