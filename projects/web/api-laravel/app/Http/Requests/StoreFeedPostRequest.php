<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeedPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|string|in:workout_completed,recipe_shared,product_scanned,meal_logged,challenge_joined,recovery_milestone,cardio_activity',
            'payload' => 'required|array',
        ];
    }
}
