<?php

use App\Http\Controllers\DocumentationIndexController;
use App\Http\Controllers\HomeController;
use App\Http\Middleware\EnsureDocumentationEnabled;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class);

// The docs landing page is hidden wherever the docs themselves are — otherwise it would
// still advertise which API groups exist, and link to them.
Route::get('api/documentation', DocumentationIndexController::class)
    ->middleware(EnsureDocumentationEnabled::class);
