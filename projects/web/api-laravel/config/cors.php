<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    // Orígenes de dev + los de producción vía env CORS_ALLOWED_ORIGINS
    // (coma-separados, p.ej. "https://tracklife.vercel.app,https://tracklife.fit").
    'allowed_origins' => array_values(array_filter(array_merge([
        'http://app.tracklife.test',
        'http://tracklife.test',
        'http://www.tracklife.test',
        'http://localhost:3000',
    ], array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
