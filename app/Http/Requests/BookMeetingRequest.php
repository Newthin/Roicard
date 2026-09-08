<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookMeetingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_email' => ['required', 'string', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:20'],
            'guest_notes' => ['nullable', 'string', 'max:2000'],
            'start_time' => ['required', 'date'],
            'timezone' => ['required', 'string', 'max:50'],
            'custom_answers' => ['nullable', 'array'],
            'custom_answers.*.question' => ['required_with:custom_answers', 'string', 'max:255'],
            'custom_answers.*.answer' => ['required_with:custom_answers', 'string', 'max:1000'],
        ];
    }
}
