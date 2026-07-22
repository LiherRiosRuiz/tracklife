<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:120',
            'bio' => 'nullable|string|max:500',
            'avatar_url' => 'nullable|string|max:2048',
            'transformation_goal' => 'nullable|array',
            'privacy_settings' => 'nullable|array',
        ];
    }
}
