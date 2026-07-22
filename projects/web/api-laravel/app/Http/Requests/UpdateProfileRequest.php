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
            'transformation_goal' => 'nullable|array:target_weight,target_body_fat,deadline',
            'transformation_goal.target_weight' => 'nullable|numeric|min:20|max:500',
            'transformation_goal.target_body_fat' => 'nullable|numeric|min:0|max:100',
            'transformation_goal.deadline' => 'nullable|date',
            'privacy_settings' => 'nullable|array:meals,product_scans,progress_photos,biometrics,workouts',
            'privacy_settings.meals' => 'nullable|in:public,followers,private',
            'privacy_settings.product_scans' => 'nullable|in:public,followers,private',
            'privacy_settings.progress_photos' => 'nullable|in:public,followers,private',
            'privacy_settings.biometrics' => 'nullable|in:public,followers,private',
            'privacy_settings.workouts' => 'nullable|in:public,followers,private',
        ];
    }
}
