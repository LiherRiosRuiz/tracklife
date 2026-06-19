<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class OpenFoodFactsService
{
    public function fetchByBarcode(string $barcode): ?array
    {
        $response = Http::timeout(10)->get(
            "https://world.openfoodfacts.org/api/v2/product/{$barcode}.json"
        );

        if (! $response->ok()) {
            return null;
        }

        $data = $response->json();
        if (($data['status'] ?? 0) !== 1) {
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
        $response = Http::timeout(10)->get('https://world.openfoodfacts.org/cgi/search.pl', [
            'search_terms' => $query,
            'search_simple' => 1,
            'action' => 'process',
            'json' => 1,
            'page_size' => 15,
            'fields' => 'product_name,brands,nutriments,code',
        ]);

        if (! $response->ok()) {
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
