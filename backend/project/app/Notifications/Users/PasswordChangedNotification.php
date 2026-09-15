<?php

namespace App\Notifications\Users;

use App\Notifications\BaseNotification;

/**
 * Security notice: the account password was changed or reset — visible at
 * next login even when the actor was not the owner.
 */
class PasswordChangedNotification extends BaseNotification
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
        return 'security.password_changed';
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
