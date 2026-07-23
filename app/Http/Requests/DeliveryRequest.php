<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delivery_name' => ['required', 'string', 'max:255'],
            'street_address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:255'],
            'region' => ['required', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'gps_address' => ['nullable', 'string', 'max:255'],
            'delivery_phone' => ['required', 'string', 'max:20'],
            'delivery_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
