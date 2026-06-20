<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMacroTargetsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'calories' => 'required|numeric|min:800|max:10000',
            'protein' => 'required|numeric|min:0|max:500',
            'carbs' => 'required|numeric|min:0|max:1000',
            'fat' => 'required|numeric|min:0|max:500',
        ];
    }
}
