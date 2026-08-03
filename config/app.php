<?php

return [
    'name' => env('APP_NAME', 'Roicard'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'frontend_url' => rtrim(env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000')), '/'),
    'logo_url' => env('LOGO_URL', rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/') . '/logo.png'),
    'payment_provider' => env('PAYMENT_PROVIDER', 'mock'),

    'timezone' => 'Africa/Accra',
    'locale' => 'en',
    'fallback_locale' => 'en',
    'faker_locale' => 'en_US',
    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'previous_keys' => [
        ...array_filter(
            explode(',', env('APP_PREVIOUS_KEYS', ''))
        ),
    ],
    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],
];
