<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFavoriteRequest;
use App\Http\Resources\FavoriteResource;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::where('user_id', (string) $request->user()->_id)->get();

        return response()->json(['favorites' => FavoriteResource::collection($favorites)]);
    }

    public function store(StoreFavoriteRequest $request): JsonResponse
    {
        $data = $request->validated();

        $favorite = Favorite::firstOrCreate([
            'user_id' => (string) $request->user()->_id,
            'type' => $data['type'],
            'ref' => $data['ref'],
        ]);

        return response()->json(
            ['favorite' => new FavoriteResource($favorite)],
            $favorite->wasRecentlyCreated ? 201 : 200
        );
    }

    public function destroy(StoreFavoriteRequest $request): JsonResponse
    {
        return response()->json(['message' => 'Favorito eliminado']);
    }
}
