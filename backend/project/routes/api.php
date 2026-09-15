<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    require __DIR__.'/api-routes/administrators/index.php';
    require __DIR__.'/api-routes/common/index.php';
    require __DIR__.'/api-routes/users/index.php';
});
