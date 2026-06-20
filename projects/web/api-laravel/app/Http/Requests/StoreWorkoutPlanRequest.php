<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkoutPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:500',
            'days_per_week' => 'nullable|integer|min:1|max:7',
            'exercises' => 'required|array',
            'exercises.*.exercise_id' => 'required|string',
            'exercises.*.exercise_name' => 'required|string',
            'exercises.*.order' => 'required|integer',
            'exercises.*.sets' => 'required|array|min:1',
            'exercises.*.sets.*.set_number' => 'required|integer',
            'exercises.*.sets.*.type' => 'nullable|string|in:normal,warmup,dropset,failure',
            'exercises.*.sets.*.reps' => 'nullable|integer',
            'exercises.*.sets.*.weight' => 'nullable|numeric',
            'exercises.*.sets.*.rest_seconds' => 'nullable|integer',
        ];
    }
}
