<?php

namespace App\Models\Users\Concerns;

use App\Enums\AuthChannelEnum;
use App\Enums\AuthEventEnum;
use App\Events\Otp\OtpIssued;
use App\Exceptions\ContactAlreadySetException;
use App\Exceptions\InvalidOtpException;
use App\Services\Otp\OtpResult;
use App\Services\Otp\OtpService;

/**
 * Lets an authenticated user add + OTP-verify the contact channel they don't
 * yet have (a mobile-only account adds an email, and vice-versa), so an account
 * can carry both. Only the missing channel can be added — changing an existing
 * one is a separate flow. Anti-enumeration: a contact already used by another
 * account is issued a distinct "in use" OTP type (a notice, not a PIN) with an
 * identical result, and cannot be completed.
 */
trait ManagesContacts
{
    /**
     * OTP type for verifying a new, free contact.
     */
    public const CONTACT_OTP_TYPE = 'user_contact';

    /**
     * OTP type for a contact already in use by another account.
     */
    public const CONTACT_EXISTS_OTP_TYPE = 'user_contact_exists';

    /**
     * Begin adding the given channel's contact: issue an OTP to the new contact
     * (a notice instead, if it is already in use elsewhere) and return the result.
     */
    public function addContact(AuthChannelEnum $channel, string $contact): OtpResult
    {
        $this->assertContactUnset($channel);

        $contact = static::normalizeIdentifier($channel, $contact);
        $taken = static::whereHashed($channel->identifierField(), $contact)->exists();

        // The OTP belongs to this user (attributes its delivery log to them).
        $result = app(OtpService::class)->generate(
            static::channelOtpType($taken ? static::CONTACT_EXISTS_OTP_TYPE : static::CONTACT_OTP_TYPE, $channel),
            $contact,
            $this,
        );

        OtpIssued::dispatch($result);
        static::recordAuthEvent(AuthEventEnum::CONTACT_ADD_REQUESTED, $contact, $this);

        return $result;
    }

    /**
     * Complete adding a contact: verify the OTP, re-check the contact is still
     * free (race), then set it and its verified-at timestamp on the account.
     */
    public function verifyContact(AuthChannelEnum $channel, string $contact, string $otp): void
    {
        $this->assertContactUnset($channel);

        $contact = static::normalizeIdentifier($channel, $contact);

        // A contact taken by another account was issued the "_exists" type, so
        // verifying against the free type throws invalid_otp (indistinguishable).
        app(OtpService::class)->verify(static::channelOtpType(static::CONTACT_OTP_TYPE, $channel), $contact, $otp, revealAttempts: false);

        // Race: another account may have claimed it between add and verify.
        if (static::whereHashed($channel->identifierField(), $contact)->exists()) {
            throw new InvalidOtpException;
        }

        $this->update([
            $channel->identifierField() => $contact,
            $channel->verifiedAtColumn() => now(),
        ]);

        static::recordAuthEvent(AuthEventEnum::CONTACT_ADDED, $contact, $this);
    }

    /**
     * Guard: this flow only adds the missing channel, never changes a set one.
     */
    protected function assertContactUnset(AuthChannelEnum $channel): void
    {
        if ($this->{$channel->identifierField()} !== null) {
            throw new ContactAlreadySetException;
        }
    }
}
