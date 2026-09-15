<?php

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
|
| Group-level default rate limit for every /api/v1/* route (the `api`
| middleware group's `throttle:api`). A coarse, fail-safe backstop so a new
| route is limited by default — the tight per-route limiters (auth, OTP,
| credential minting, …) stack ON TOP and govern where they apply. Keyed per
| authenticated principal (admin/user), else the client IP. Raise via
| API_RATE_LIMIT if list-heavy dashboards need more headroom.
|
*/

return [

    'rate_limit' => max(1, (int) env('API_RATE_LIMIT', 60)),

];
