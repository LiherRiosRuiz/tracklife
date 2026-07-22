<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'meal_type' => 'sometimes|in:breakfast,lunch,snack,dinner,other',
            'items' => 'sometimes|array|min:1',
            'items.*.name' => 'required|string|max:120',
            'items.*.quantity' => 'nullable|numeric|min:0|max:100000',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.calories' => 'nullable|numeric|min:0|max:10000',
            'items.*.protein' => 'nullable|numeric|min:0|max:100000',
            'items.*.carbs' => 'nullable|numeric|min:0|max:100000',
            'items.*.fat' => 'nullable|numeric|min:0|max:100000',
            'photo_url' => 'nullable|string|max:2048',
            'notes' => 'nullable|string|max:500',
            'shared_to_feed' => 'nullable|boolean',
        ];
    }
}
