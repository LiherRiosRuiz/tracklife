<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => 'nullable|date',
            'meal_type' => 'required|in:breakfast,lunch,snack,dinner,other',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:120',
            'items.*.quantity' => 'nullable|numeric',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.calories' => 'nullable|numeric',
            'items.*.protein' => 'nullable|numeric',
            'items.*.carbs' => 'nullable|numeric',
            'items.*.fat' => 'nullable|numeric',
            'photo_url' => 'nullable|string|max:2048',
            'notes' => 'nullable|string|max:500',
            'shared_to_feed' => 'nullable|boolean',
        ];
    }
}
