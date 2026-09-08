<?php

namespace App\Http\Requests;

use App\Models\MeetingType;
use Illuminate\Foundation\Http\FormRequest;

class StoreMeetingTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $formats = implode(',', MeetingType::FORMATS);

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'duration_minutes' => ['required', 'integer', 'in:15,30,45,60'],
            'format' => ['required', 'string', "in:{$formats}"],
            'location_detail' => ['nullable', 'string', 'max:500'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'meeting_link' => ['nullable', 'url', 'max:2000'],
            'buffer_minutes' => ['nullable', 'integer', 'in:0,10,15,30'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:10'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'min_notice_hours' => ['nullable', 'integer', 'in:1,3,6,12,24,48'],
            'advance_booking_days' => ['nullable', 'integer', 'in:7,14,30,60,90'],
            'max_bookings_per_day' => ['nullable', 'integer', 'min:1'],
            'availability' => ['nullable', 'array'],
            'availability.*.day_of_week' => ['required_with:availability', 'integer', 'min:0', 'max:6'],
            'availability.*.start_time' => ['required_with:availability', 'string', 'date_format:H:i'],
            'availability.*.end_time' => ['required_with:availability', 'string', 'date_format:H:i', 'after:availability.*.start_time'],
            'custom_questions' => ['nullable', 'array', 'max:3'],
            'custom_questions.*.question' => ['required_with:custom_questions', 'string', 'max:255'],
            'custom_questions.*.is_required' => ['nullable', 'boolean'],
        ];
    }
}
