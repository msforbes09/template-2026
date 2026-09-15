<?php

namespace App\Services\Sms;

/**
 * Outbound SMS provider contract. Bind a real provider in a service provider;
 * the template ships with a log-only implementation (LogSmsSender).
 */
interface SmsSender
{
    /**
     * Send one text. `$causer` (`{user_type, user_id}`) attributes the send when
     * it runs outside a request (queued jobs), where no auth guard can resolve it.
     *
     * @param  array{user_type: string, user_id: int}|null  $causer
     */
    public function send(string $number, string $message, ?array $causer = null): void;
}
