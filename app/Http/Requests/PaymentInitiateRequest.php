<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentInitiateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // `amount` is intentionally NOT accepted: the server derives it
            // from the user's campaign context so pricing can't be spoofed.
            'campaign_code' => ['nullable', 'string', 'max:40'],
            'currency' => ['nullable', 'string', 'max:3'],
            'method' => ['nullable', 'string', 'in:card,mobile_money'],
            'momo_number' => ['nullable', 'string', 'max:20'],
        ];
    }
}