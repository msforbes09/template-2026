<?php

namespace App\Notifications\Users;

use App\Notifications\BaseNotification;

/**
 * Security notice: this soft-deleted account was recovered via
 * re-registration on a verified channel.
 */
class AccountRecoveredNotification extends BaseNotification
{
    /**
     * Create the notification.
     */
    public function __construct(public readonly string $channel) {}

    /**
     * The stored `type`.
     */
    public function databaseType(object $notifiable): string
    {
        return 'security.account_recovered';
    }

    /**
     * The stored payload (always carries `reference`).
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return ['channel' => $this->channel, 'reference' => null];
    }
}
