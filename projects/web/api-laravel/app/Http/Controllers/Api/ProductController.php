<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\FeedService;
use App\Services\HealthScoreService;
use App\Services\OpenFoodFactsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        private OpenFoodFactsService $offService,
        private HealthScoreService $healthScoreService,
        private FeedService $feedService,
    ) {}

    public function byBarcode(string $barcode): JsonResponse
    {
        $product = Product::where('barcode', $barcode)->first();

        if (! $product) {
            $external = $this->offService->fetchByBarcode($barcode);
            if (! $external) {
                return response()->json(['message' => 'Producto no encontrado'], 404);
            }

            $score = $this->healthScoreService->calculate(
                $external['nutriments'],
                $external['nova_group'],
                $external['ingredients']
            );

            $product = Product::create(array_merge($external, $score));
        }

        return response()->json(['product' => $product]);
    }

    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'barcode' => 'required|string',
            'share_to_feed' => 'nullable|boolean',
        ]);

        $product = Product::where('barcode', $data['barcode'])->first();

        if (! $product) {
            $external = $this->offService->fetchByBarcode($data['barcode']);
            if (! $external) {
                return response()->json(['message' => 'Producto no encontrado'], 404);
            }

            $score = $this->healthScoreService->calculate(
                $external['nutriments'],
                $external['nova_group'],
                $external['ingredients']
            );

            $product = Product::create(array_merge($external, $score));
        }

        if ($data['share_to_feed'] ?? false) {
            $this->feedService->createPost($request->user(), 'product_scanned', [
                'product_id' => (string) $product->_id,
                'barcode' => $data['barcode'],
                'name' => $product->name,
                'health_score' => $product->health_score,
                'message' => sprintf(
                    'escaneó %s: score %d/100',
                    $product->name,
                    $product->health_score
                ),
            ]);
        }

        return response()->json(['product' => $product]);
    }

    public function show(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        return response()->json(['product' => $product]);
    }
}
