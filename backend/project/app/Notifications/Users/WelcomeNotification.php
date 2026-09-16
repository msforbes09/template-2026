<?php

namespace App\Notifications\Users;

use App\Notifications\BaseNotification;

/**
 * Greets a user on their very first login.
 */
class WelcomeNotification extends BaseNotification
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
        return 'welcome';
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
