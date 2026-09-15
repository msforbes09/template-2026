<?php

namespace App\Notifications\Users;

use App\Notifications\BaseNotification;

/**
 * An admin broadcast announcement — the platform speaking to the user
 * (maintenance windows, programme news, account nudges).
 */
class AnnouncementNotification extends BaseNotification
{
    /**
     * Create the notification.
     */
    public function __construct(public readonly string $title, public readonly string $body) {}

    /**
     * The stored `type`.
     */
    public function databaseType(object $notifiable): string
    {
        return 'announcement';
    }

    /**
     * The stored payload (always carries `reference`).
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'reference' => null,
        ];
    }
}
