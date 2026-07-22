<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenFoodFactsService
{
    public function fetchByBarcode(string $barcode): ?array
    {
        try {
            $response = Http::timeout(10)->get(
                "https://world.openfoodfacts.org/api/v2/product/{$barcode}.json"
            );
        } catch (ConnectionException $e) {
            Log::warning('OpenFoodFacts request timed out or failed to connect', [
                'barcode' => $barcode,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if (! $response->ok()) {
            Log::warning('OpenFoodFacts returned a non-OK response', [
                'barcode' => $barcode,
                'status' => $response->status(),
            ]);

            return null;
        }

        $data = $response->json();
        if (($data['status'] ?? 0) !== 1) {
            Log::warning('OpenFoodFacts returned malformed or not-found product data', [
                'barcode' => $barcode,
                'status_field' => $data['status'] ?? null,
            ]);

            return null;
        }

        $product = $data['product'];

        return [
            'barcode' => $barcode,
            'name' => $product['product_name'] ?? $product['product_name_es'] ?? 'Producto sin nombre',
            'brand' => $product['brands'] ?? null,
            'image_url' => $product['image_front_url'] ?? null,
            'nutriments' => $product['nutriments'] ?? [],
            'ingredients' => $product['ingredients_text'] ?? $product['ingredients_text_es'] ?? null,
            'nova_group' => isset($product['nova_group']) ? (int) $product['nova_group'] : null,
            'source' => 'open_food_facts',
        ];
    }

    public function searchFoods(string $query): array
    {
        try {
            $response = Http::timeout(10)->get('https://world.openfoodfacts.org/cgi/search.pl', [
                'search_terms' => $query,
                'search_simple' => 1,
                'action' => 'process',
                'json' => 1,
                'page_size' => 15,
                'fields' => 'product_name,brands,nutriments,code',
            ]);
        } catch (ConnectionException $e) {
            Log::warning('OpenFoodFacts search request timed out or failed to connect', [
                'query' => $query,
                'error' => $e->getMessage(),
            ]);

            return [];
        }

        if (! $response->ok()) {
            Log::warning('OpenFoodFacts search returned a non-OK response', [
                'query' => $query,
                'status' => $response->status(),
            ]);

            return [];
        }

        return collect($response->json('products', []))
            ->map(fn (array $p) => [
                'barcode' => $p['code'] ?? null,
                'name' => $p['product_name'] ?? 'Sin nombre',
                'brand' => $p['brands'] ?? null,
                'nutriments' => $p['nutriments'] ?? [],
            ])
            ->filter(fn (array $p) => ! empty($p['name']))
            ->values()
            ->all();
    }
}
