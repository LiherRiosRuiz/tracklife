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
            'sets' => 'required|array|max:200',
            'sets.*.exercise' => 'required|string|max:120',
            'sets.*.exercise_id' => 'nullable|string',
            'sets.*.set_number' => 'nullable|integer',
            'sets.*.type' => 'nullable|string|in:normal,warmup,dropset,failure',
            'sets.*.reps' => 'nullable|integer|min:0|max:1000',
            'sets.*.weight' => 'nullable|numeric|min:0|max:1000',
            'sets.*.rest_seconds' => 'nullable|integer|min:0',
            'duration_minutes' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:500',
            'shared_to_feed' => 'nullable|boolean',
        ];
    }
}
