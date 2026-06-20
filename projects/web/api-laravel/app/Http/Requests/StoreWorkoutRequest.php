<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'date' => 'nullable|date',
            'sets' => 'required|array',
            'duration_minutes' => 'nullable|integer',
            'notes' => 'nullable|string',
            'shared_to_feed' => 'nullable|boolean',
        ];
    }
}
