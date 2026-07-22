<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBiometricRequest extends FormRequest
{
    /**
     * Realistic [min, max] value bounds per biometric type.
     *
     * - weight (kg), resting_hr (bpm), steps (count/day), hrv (ms): device/real-world plausible ranges.
     * - body_fat, muscle_mass, spO2, sleep_score, recovery_score (%): 0-100 scale.
     * - strain: WHOOP-style exertion scale (0-21), the convention this app's device integrations
     *   (Zepp, Whoop, Garmin) target.
     */
    public const VALUE_BOUNDS = [
        'sleep_score' => [0, 100],
        'hrv' => [0, 500],
        'resting_hr' => [20, 250],
        'recovery_score' => [0, 100],
        'strain' => [0, 21],
        'steps' => [0, 200000],
        'weight' => [20, 500],
        'body_fat' => [0, 100],
        'muscle_mass' => [0, 100],
        'spO2' => [0, 100],
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|in:sleep_score,hrv,resting_hr,recovery_score,strain,steps,weight,body_fat,muscle_mass,spO2',
            'value' => ['required', 'numeric', function ($attribute, $value, $fail) {
                $bounds = self::VALUE_BOUNDS[$this->input('type')] ?? null;

                if ($bounds !== null && ($value < $bounds[0] || $value > $bounds[1])) {
                    $fail("The {$attribute} for type '{$this->input('type')}' must be between {$bounds[0]} and {$bounds[1]}.");
                }
            }],
            'unit' => 'nullable|string|max:50',
            'timestamp' => 'nullable|date',
            'source' => 'nullable|string|max:50',
            'metadata' => 'nullable|array',
        ];
    }
}
