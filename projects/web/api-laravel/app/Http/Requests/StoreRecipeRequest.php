<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'ingredients' => 'required|array',
            'steps' => 'nullable|array',
            'servings' => 'nullable|integer|min:1',
            'totals_per_serving' => 'nullable|array',
            'is_public' => 'nullable|boolean',
            'is_premium' => 'nullable|boolean',
            'price' => 'nullable|numeric|min:0',
        ];
    }
}
