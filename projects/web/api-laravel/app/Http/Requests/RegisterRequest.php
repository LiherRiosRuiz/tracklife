<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:8|max:255',
            'username' => 'nullable|string|max:60',
            // Two separate consents, not one. GDPR art. 9(2)(a) requires explicit
            // consent for health data that is separate from the contractual basis
            // covering the terms; a single bundled checkbox is the pattern the
            // EDPB calls invalid. They are also independently withdrawable.
            //
            // Note the asymmetry: the client sends ASSERTIONS (accept_*), the
            // server stores TIMESTAMPS. The client never names a model field.
            'accept_terms' => 'required|accepted',
            'accept_health_data' => 'required|accepted',
        ];
    }

    public function messages(): array
    {
        return [
            'accept_terms.required' => 'Debes aceptar los términos y la política de privacidad.',
            'accept_terms.accepted' => 'Debes aceptar los términos y la política de privacidad.',
            'accept_health_data.required' => 'Debes dar tu consentimiento explícito para tratar tus datos de salud.',
            'accept_health_data.accepted' => 'Debes dar tu consentimiento explícito para tratar tus datos de salud.',
        ];
    }
}
