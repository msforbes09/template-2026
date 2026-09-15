<?php

namespace App\Services\Sms;

use App\Services\Security\PiiMasker;
use Illuminate\Support\Facades\Log;

/**
 * Development SMS sender: writes the text to the log with the number masked and
 * any standalone 4–8 digit run (an OTP/PIN) blanked, so a code never lands in a
 * log file in the clear.
 */
class LogSmsSender implements SmsSender
{
    /**
     * Log the message instead of sending it.
     *
     * @param  array{user_type: string, user_id: int}|null  $causer
     */
    public function send(string $number, string $message, ?array $causer = null): void
    {
        $redacted = (string) preg_replace_callback('/(?<!\d)\d{4,8}(?!\d)/', fn (array $m) => str_repeat('*', strlen($m[0])), $message);

        Log::info('SMS (log driver)', [
            'number' => PiiMasker::maskMobile($number, '*'),
            'message' => $redacted,
            'causer' => $causer,
        ]);
    }
}
