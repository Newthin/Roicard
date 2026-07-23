<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SocialLinksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'links' => ['required', 'array', 'min:1'],
            'links.*.platform' => ['required', 'string', 'max:50'],
            'links.*.value' => ['required', 'string', 'max:500'],
        ];
    }
}
