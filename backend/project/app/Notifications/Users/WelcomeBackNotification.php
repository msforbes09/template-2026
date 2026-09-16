<?php

namespace App\Notifications\Users;

use App\Notifications\BaseNotification;

/**
 * Greets a user returning after a long absence.
 */
class WelcomeBackNotification extends BaseNotification
{
    /**
     * Create the notification.
     */
    public function __construct(public readonly int $daysAway) {}

    /**
     * The stored `type`.
     */
    public function databaseType(object $notifiable): string
    {
        return 'welcome.back';
    }

    /**
     * The stored payload (always carries `reference`).
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return ['days_away' => $this->daysAway, 'reference' => null];
    }
}
