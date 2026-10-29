<?php

namespace App\Services\Admin;

use App\Models\User;

/**
 * Turns an admin-authored plain-text message into safe HTML.
 *
 * Rules:
 *  - every character from the composer is HTML-escaped first;
 *  - blank lines become paragraphs, single newlines become <br>;
 *  - bare http(s) URLs become links;
 *  - only a fixed set of {placeholders} is substituted.
 *
 * No raw HTML from the composer can reach the mail template.
 */
class AdminMessageRenderer
{
    public const PLACEHOLDERS = [
        'first_name',
        'last_name',
        'full_name',
        'email',
    ];

    /**
     * Any {token} that is not in PLACEHOLDERS. Unknown tokens are rejected so
     * they are never sent literally.
     *
     * @return array<int, string>
     */
    public function unknownPlaceholders(string ...$texts): array
    {
        $unknown = [];

        foreach ($texts as $text) {
            preg_match_all('/\{([A-Za-z0-9_]+)\}/', $text, $matches);

            foreach ($matches[1] as $token) {
                if (! in_array($token, self::PLACEHOLDERS, true)) {
                    $unknown[$token] = true;
                }
            }
        }

        return array_keys($unknown);
    }

    public function personalize(string $text, ?User $user, string $fallbackEmail = ''): string
    {
        $firstName = $user?->first_name ?? '';
        $lastName = $user?->last_name ?? '';
        $fullName = trim($firstName . ' ' . $lastName);
        $email = $user?->email ?? $fallbackEmail;

        return strtr($text, [
            '{first_name}' => $firstName,
            '{last_name}' => $lastName,
            '{full_name}' => $fullName,
            '{email}' => $email,
        ]);
    }

    public function subject(string $subject, ?User $user, string $fallbackEmail = ''): string
    {
        return trim(str_replace(["\r", "\n"], ' ', $this->personalize($subject, $user, $fallbackEmail)));
    }

    /**
     * @return array{text: string, html: string}
     */
    public function render(string $body, ?User $user, string $fallbackEmail = ''): array
    {
        $text = $this->personalize($body, $user, $fallbackEmail);

        return [
            'text' => $text,
            'html' => $this->toHtml($text),
        ];
    }

    public function toHtml(string $text): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $text);
        $escaped = htmlspecialchars($normalized, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $linked = preg_replace_callback(
            '~https?://[^\s<>"\']+~i',
            function (array $match): string {
                $url = $match[0];
                $trailing = '';

                // Keep sentence punctuation outside the anchor.
                while ($url !== '' && str_contains('.,;:!?)]}', substr($url, -1))) {
                    $trailing = substr($url, -1) . $trailing;
                    $url = substr($url, 0, -1);
                }

                if ($url === '') {
                    return $match[0];
                }

                return '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">' . $url . '</a>' . $trailing;
            },
            $escaped,
        );

        $paragraphs = preg_split('/\n{2,}/', (string) $linked) ?: [];
        $html = '';

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);

            if ($paragraph === '') {
                continue;
            }

            $html .= '<p>' . nl2br($paragraph, false) . '</p>';
        }

        return $html;
    }
}
