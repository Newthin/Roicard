<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
class ProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'role_description' => ['nullable', 'string', 'max:1000'],
            'organisation' => ['nullable', 'string', 'max:255'],
            'whatsapp_phone' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'in:male,female,prefer_not_to_say'],
            'interests' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            // No length cap on bio: storage is a TEXT column and truncation is
            // presentation-layer only.
            'bio' => ['nullable', 'string'],
            'seeking' => ['nullable', 'string', 'max:1000'],
            'offering' => ['nullable', 'string', 'max:1000'],
            // `is_live` is deliberately NOT accepted here. Publication is a
            // membership side effect (payment activation or admin override),
            // never a field a profile form can set.
            'social_links' => ['nullable', 'string'],

            // Optional replace-all collections. Used by the admin "complete
            // member setup" flow; the member UI manages them with dedicated
            // endpoints, but both paths persist through ProfileSaveService.
            'education' => ['sometimes', 'array'],
            'education.*.institution' => ['required', 'string', 'max:255'],
            'education.*.degree' => ['required', 'string', 'max:255'],
            'education.*.start_year' => ['required', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'education.*.end_year' => ['nullable', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'education.*.honours' => ['nullable', 'string', 'max:255'],

            'experience' => ['sometimes', 'array'],
            'experience.*.title' => ['required', 'string', 'max:255'],
            'experience.*.company' => ['required', 'string', 'max:255'],
            'experience.*.start_date' => ['required', 'date'],
            'experience.*.end_date' => ['nullable', 'date'],
            'experience.*.location' => ['nullable', 'string', 'max:255'],

            'achievements' => ['sometimes', 'array'],
            'achievements.*.title' => ['required', 'string', 'max:255'],
            'achievements.*.issuer' => ['nullable', 'string', 'max:255'],
            'achievements.*.date' => ['nullable', 'date'],

            // Admin-only opt-in; ignored by the member profile flow.
            'send_welcome_email' => ['sometimes', 'boolean'],
            // Admin can fill a profile while deliberately leaving the member
            // in the onboarding journey (default is to mark setup complete).
            'mark_onboarding_complete' => ['sometimes', 'boolean'],
        ];
    }
}
