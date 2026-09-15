<?php

namespace App\Models\Users\Concerns;

use App\Enums\AuthChannelEnum;

/**
 * Shared channel resolution for the user auth flows (registration, login/2FA,
 * password reset). An AuthChannelEnum selects the identifier (email vs mobile
 * number), its blind-index column, and the OTP type suffix.
 */
trait ResolvesAuthChannel
{
    /**
     * Normalise a mobile number for storage/lookup (trimmed; already E.164).
     */
    public static function normalizeMobile(?string $number): ?string
    {
        return $number === null ? null : trim($number);
    }

    /**
     * The normalised identifier for a channel, pulled from a data array.
     *
     * @param  array<string, mixed>  $data
     */
    protected static function channelIdentifier(AuthChannelEnum $channel, array $data): ?string
    {
        return static::normalizeIdentifier($channel, $data[$channel->identifierField()] ?? null);
    }

    /**
     * Normalise a raw identifier value for a channel (mobile vs email rules).
     */
    protected static function normalizeIdentifier(AuthChannelEnum $channel, ?string $identifier): ?string
    {
        return $channel === AuthChannelEnum::SMS
            ? static::normalizeMobile($identifier)
            : static::normalizeEmail($identifier);
    }

    /**
     * The full OTP type for a purpose + channel (e.g. `user_registration_sms`).
     */
    protected static function channelOtpType(string $purpose, AuthChannelEnum $channel): string
    {
        return "{$purpose}_{$channel->value}";
    }
}
