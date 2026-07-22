<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|in:run,bike,swim,walk,other',
            'title' => 'required|string|max:120',
            'date' => 'nullable|date',
            'duration_minutes' => 'nullable|integer',
            'distance_km' => 'nullable|numeric',
            'calories' => 'nullable|integer',
            'avg_heart_rate' => 'nullable|integer',
            'route' => 'nullable|array',
            'elevation_gain' => 'nullable|numeric',
            'notes' => 'nullable|string|max:500',
            'source' => 'nullable|string|max:50',
            'shared_to_feed' => 'nullable|boolean',
        ];
    }
}
