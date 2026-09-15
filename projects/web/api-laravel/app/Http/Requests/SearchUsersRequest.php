<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The last inline $request->validate() in the controller layer. This project's
 * convention (see projects/web/api-laravel/CLAUDE.md) is that every validated
 * request goes through a FormRequest.
 */
class SearchUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => 'required|string|min:2',
        ];
    }
}
