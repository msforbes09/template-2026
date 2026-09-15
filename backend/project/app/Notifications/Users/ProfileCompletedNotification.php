<?php

namespace App\Notifications\Users;

use App\Notifications\BaseNotification;

/**
 * Tells a user what completing their profile just unlocked:
 * the rest of the account.
 */
class ProfileCompletedNotification extends BaseNotification
{
    /**
     * Create the notification.
     */
    public function __construct() {}

    /**
     * The stored `type`.
     */
    public function databaseType(object $notifiable): string
    {
        return 'profile.completed';
    }

    /**
     * The stored payload (always carries `reference`).
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return ['reference' => null];
    }
}
