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
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'nullable|numeric',
            'items.*.unit' => 'nullable|string',
            'items.*.calories' => 'nullable|numeric',
            'items.*.protein' => 'nullable|numeric',
            'items.*.carbs' => 'nullable|numeric',
            'items.*.fat' => 'nullable|numeric',
            'photo_url' => 'nullable|string',
            'notes' => 'nullable|string',
            'shared_to_feed' => 'nullable|boolean',
        ];
    }
}
