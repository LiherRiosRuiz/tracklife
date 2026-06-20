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
            'photo_url' => 'nullable|string',
            'notes' => 'nullable|string',
            'shared_to_feed' => 'nullable|boolean',
        ];
    }
}
