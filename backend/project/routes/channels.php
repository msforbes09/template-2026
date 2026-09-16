<?php

use App\Enums\PermissionEnum;
use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// A user's own private channel — general-purpose. Authorized on the `users`
// guard by ownership of the uuid in the channel name.
Broadcast::channel('user.{uuid}', function (User $user, string $uuid) {
    return $user->uuid === $uuid;
}, ['guards' => ['users']]);

// Shared private channel for the administrators' live feed. Subscribed by the client
// as `private-administrators`; authorized via the `administrators` Sanctum guard (see
// the admin broadcasting/auth endpoint). Restricted to admins who can view at least
// one operational log, since the feed carries log-derived events.
//
// An admin still holding a temporary password is refused whatever their permissions:
// they have not finished setting up the account, so we cannot yet say that the person
// on the socket is the person the account belongs to.
Broadcast::channel('administrators', function (Administrator $administrator) {
    if ($administrator->with_temporary_password) {
        return false;
    }

    return $administrator->canAny([
        PermissionEnum::AUDIT_LOGS_VIEW,
        PermissionEnum::AUTH_LOGS_VIEW,
        PermissionEnum::CONNECTION_LOGS_VIEW,
    ]);
}, ['guards' => ['administrators']]);
