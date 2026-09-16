<?php

/*
|--------------------------------------------------------------------------
| End-user accounts
|--------------------------------------------------------------------------
|
| Profile edit cooldown: once a profile is completed, the details and the photo
| may each change only every N days (their clocks anchor to the later of the
| completion stamp and that group's last change). Draft accounts edit freely;
| a missing photo can always be set.
|
*/

return [

    'profile_cooldown_days' => max(1, (int) env('USER_PROFILE_COOLDOWN_DAYS', 30)),

    // How long after self-deletion a website account may be recovered by
    // re-registering its identifier. Past this window the identifier may have
    // been recycled (a reassigned mobile / re-issued mailbox), so re-registration
    // is treated as a fresh account rather than handing over the old one.
    // Clamped so a blank env can never open recovery to all-time.
    'recovery_window_days' => max(1, (int) env('USER_RECOVERY_WINDOW_DAYS', 30)),

];
