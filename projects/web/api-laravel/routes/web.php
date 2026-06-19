<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'TRACKLIFE API',
        'version' => '1.0',
        'docs' => '/api/health',
    ]);
});
