<?php

return [
    'default' => env('MAIL_MAILER', 'log'),
    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN'),
        ],
        'ses' => [
            'transport' => 'ses',
        ],
        'postmark' => [
            'transport' => 'postmark',
        ],
        'resend' => [
            'transport' => 'resend',
        ],
        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -bs -i'),
        ],
        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],
        'array' => [
            'transport' => 'array',
        ],
        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
        ],
    ],
    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@roicard.com'),
        'name' => env('MAIL_FROM_NAME', 'Roicard'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Manual Admin Messages
    |--------------------------------------------------------------------------
    |
    | Replies are intentionally disabled: no Reply-To header is set. Members
    | are pointed at the support address in the footer instead. Quotas mirror
    | the Resend Free plan and must not be used to bypass provider limits.
    |
    */
    'admin' => [
        'from_address' => env('ADMIN_MAIL_FROM_ADDRESS', env('MAIL_FROM_ADDRESS', 'admin@myroicard.com')),
        'from_name' => env('ADMIN_MAIL_FROM_NAME', 'Roicard'),
        'support_email' => env('SUPPORT_EMAIL', 'support@myroicard.com'),
        'duplicate_window_days' => (int) env('ADMIN_MAIL_DUPLICATE_WINDOW_DAYS', 7),
        'rate_per_second' => (int) env('ADMIN_MAIL_RATE_PER_SECOND', 8),
        'daily_quota' => (int) env('RESEND_DAILY_QUOTA', 100),
        'monthly_quota' => (int) env('RESEND_MONTHLY_QUOTA', 3000),
    ],

    'markdown' => [
        'theme' => 'default',
        'paths' => [
            resource_path('views/vendor/mail'),
        ],
    ],
];
