<?php

namespace Tests\Fakes;

use App\Services\Sms\SmsSender;

/**
 * Test double for the SMS provider: records every send so a test can read the
 * delivered text (and its PIN) back instead of hitting a real gateway.
 */
class FakeSmsSender implements SmsSender
{
    /**
     * Every send, in order, as `{number, message, causer}`.
     *
     * @var list<array{number: string, message: string, causer: array{user_type: string, user_id: int}|null}>
     */
    public array $sent = [];

    /**
     * Record the send instead of delivering it.
     *
     * @param  array{user_type: string, user_id: int}|null  $causer
     */
    public function send(string $number, string $message, ?array $causer = null): void
    {
        $this->sent[] = ['number' => $number, 'message' => $message, 'causer' => $causer];
    }

    /**
     * The first 6-digit PIN found in any recorded message, or null.
     */
    public function pin(): ?string
    {
        foreach ($this->sent as $sms) {
            if (preg_match('/(\d{6})/', $sms['message'], $m)) {
                return $m[1];
            }
        }

        return null;
    }
}
