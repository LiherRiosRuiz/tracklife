<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFollowRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'followed_id' => $this->route('id'),
        ]);
    }

    public function rules(): array
    {
        return [
            'followed_id' => [
                'required',
                'string',
                Rule::notIn([(string) $this->user()->_id]),
            ],
        ];
    }
}
