<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBiometricRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|in:sleep_score,hrv,resting_hr,recovery_score,strain,steps,weight,body_fat,muscle_mass,spO2',
            'value' => 'required|numeric',
            'unit' => 'nullable|string|max:50',
            'timestamp' => 'nullable|date',
            'source' => 'nullable|string|max:50',
            'metadata' => 'nullable|array',
        ];
    }
}
