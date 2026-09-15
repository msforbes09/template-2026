<?php

namespace App\Services\Notifications;

/**
 * Server-rendered notification text. Turns a stored notification's `type` +
 * `data` payload into the `{title, message}` pair the FE renders verbatim —
 * computed at read time (list resource + realtime broadcast), never stored, so
 * copy changes and APP_NAME rebrands apply to old rows on a plain code release.
 *
 * The FE keeps the presentational mapping (tone/icon/toast, keyed by `type`)
 * and derives deep links from `data.reference`; only the text lives here.
 * Unknown types fall back to a generic title so legacy/future rows always
 * render. The platform name always comes from config('app.name') and the copy
 * around it stays article-free (the name is configurable).
 */
class NotificationCopy
{
    /**
     * Render the `{title, message}` pair for a stored notification row.
     * Interpolation is defensive: a missing data key degrades to a neutral
     * placeholder, never an error.
     *
     * @param  array<string, mixed>|null  $data
     * @return array{title: string, message: string|null}
     */
    public static function render(string $type, ?array $data): array
    {
        $data ??= [];
        $brand = config('app.name');

        [$title, $message] = match ($type) {
            'welcome' => ['Welcome to '.$brand, 'Complete your profile to unlock the rest of your account.'],
            'profile.completed' => ['Your profile is complete', 'You now have full access to your account.'],
            'welcome.back' => ['Welcome back!', isset($data['days_away']) ? "It's been {$data['days_away']} days since your last visit." : 'Good to see you again.'],
            'security.password_changed' => ['Your password was changed', "If this wasn't you, contact our support team immediately."],
            'security.account_recovered' => ['Account recovered', 'Your account was restored via email verification.'],
            'announcement' => [$data['title'] ?? 'Announcement', $data['body'] ?? null],
            default => ['You have a new notification', null],
        };

        return ['title' => $title, 'message' => $message];
    }
}
