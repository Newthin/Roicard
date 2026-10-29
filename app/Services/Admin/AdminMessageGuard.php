<?php

namespace App\Services\Admin;

use App\Models\AdminMessage;

/**
 * Content guardrails for manually authored member email.
 */
class AdminMessageGuard
{
    public function __construct(private readonly AdminMessageRenderer $renderer) {}

    /**
     * @return array<int, string> human-readable validation errors
     */
    public function validate(string $category, string $subject, string $body): array
    {
        $errors = [];

        $unknown = $this->renderer->unknownPlaceholders($subject, $body);
        if ($unknown !== []) {
            $errors[] = 'Unknown placeholder(s): {' . implode('}, {', $unknown) . '}. Allowed: {'
                . implode('}, {', AdminMessageRenderer::PLACEHOLDERS) . '}.';
        }

        if ($category === AdminMessage::CATEGORY_NUDGE) {
            $errors = array_merge($errors, $this->nudgeErrors($subject . "\n" . $body));
        }

        return $errors;
    }

    /**
     * A draft nudge must describe the profile as a draft. It must never claim
     * the profile is already live, public, published or shareable — that would
     * contradict User::draftClosesAt() and the automated reminder sequence.
     *
     * @return array<int, string>
     */
    private function nudgeErrors(string $text): array
    {
        $errors = [];

        if (! preg_match('/\b(draft|private)\b/i', $text)) {
            $errors[] = 'A draft nudge must say the profile is saved privately as a draft '
                . '(use the word “draft” or “private”).';
        }

        $misleading = [
            '/\b(profile|account|roicard|it|they)\b[^.!?\n]{0,50}\b(is|are)\s+(now\s+)?(live|public|published|shareable)\b/i',
            '/\b(has|have)\s+(gone|been)\s+(live|public|published)\b/i',
            '/\bshareable\b/i',
        ];

        foreach ($misleading as $pattern) {
            if (preg_match($pattern, $text)) {
                $errors[] = 'A draft nudge cannot describe the profile as live, public, published '
                    . 'or shareable. Say it is saved privately as a draft and that activating makes it live.';
                break;
            }
        }

        return $errors;
    }
}
