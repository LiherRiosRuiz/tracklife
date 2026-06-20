<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRecipeRequest;
use App\Models\Recipe;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecipeController extends Controller
{
    public function __construct(private FeedService $feedService) {}

    public function index(Request $request): JsonResponse
    {
        $recipes = Recipe::where(function ($q) use ($request) {
            $q->where('is_public', true)
                ->orWhere('user_id', (string) $request->user()->_id);
        })->orderBy('created_at', 'desc')->limit(50)->get();

        return response()->json(['recipes' => $recipes]);
    }

    public function store(StoreRecipeRequest $request): JsonResponse
    {
        $data = $request->validated();

        $recipe = Recipe::create(array_merge($data, [
            'user_id' => (string) $request->user()->_id,
            'is_public' => $data['is_public'] ?? true,
            'is_premium' => $data['is_premium'] ?? false,
        ]));

        if ($recipe->is_public) {
            $this->feedService->createPost($request->user(), 'recipe_shared', [
                'recipe_id' => (string) $recipe->_id,
                'title' => $recipe->title,
                'message' => "compartió la receta \"{$recipe->title}\"",
            ]);
        }

        return response()->json(['recipe' => $recipe], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['recipe' => Recipe::findOrFail($id)]);
    }
}
