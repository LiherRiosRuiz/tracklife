<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExerciseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'muscle_group' => 'nullable|string|max:50',
            'equipment' => 'nullable|string|max:50',
            'category' => 'nullable|string|max:50',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string',
            'tips' => 'nullable|array',
            'tips.*' => 'string',
        ];
    }
}
