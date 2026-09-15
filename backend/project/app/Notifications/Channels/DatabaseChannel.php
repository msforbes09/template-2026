<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Channels\DatabaseChannel as BaseDatabaseChannel;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Arr;

/**
 * The framework's database channel stamps a uuid into every insert; this table
 * uses an auto-increment integer id (user decision — consistent with the other
 * user-facing numeric ids). Dropping the stamped id lets MySQL assign it.
 * Bound over the base channel in AppServiceProvider::register().
 */
class DatabaseChannel extends BaseDatabaseChannel
{
    /**
     * Build the payload, minus the framework's uuid id.
     *
     * @return array<string, mixed>
     */
    protected function buildPayload($notifiable, Notification $notification): array
    {
        return Arr::except(parent::buildPayload($notifiable, $notification), ['id']);
    }
}
