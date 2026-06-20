<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScanProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'barcode' => 'required|string',
            'share_to_feed' => 'nullable|boolean',
        ];
    }
}
