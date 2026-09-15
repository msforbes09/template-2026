<?php

namespace App\Enums;

/**
 * The channel a user authenticates through (registration, login, password
 * reset): email or SMS. It encapsulates which identifier/column each channel
 * uses, so the flows never branch on raw `'email'`/`'sms'` strings.
 */
enum AuthChannelEnum: string
{
    case EMAIL = 'email';
    case SMS = 'sms';

    /**
     * The identifier field (and blind-index column) this channel is keyed on.
     */
    public function identifierField(): string
    {
        return $this === self::SMS ? 'mobile_number' : 'email';
    }

    /**
     * The `*_verified_at` column stamped when this channel is verified.
     */
    public function verifiedAtColumn(): string
    {
        return $this === self::SMS ? 'mobile_number_verified_at' : 'email_verified_at';
    }
}
