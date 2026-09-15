<?php

namespace App\Models\Users\Requests\Concerns;

use App\Enums\AuthChannelEnum;

/**
 * Resolves the auth channel and its identifier from a validated request, so
 * controllers don't hand-roll the `channel === 'sms' ? mobile_number : email`
 * branch. Used by the channel-aware user auth requests.
 */
trait ResolvesChannelInput
{
    /**
     * The validated channel (defaults to email when absent).
     */
    public function channel(): AuthChannelEnum
    {
        return AuthChannelEnum::from($this->validated('channel') ?? AuthChannelEnum::EMAIL->value);
    }

    /**
     * The validated identifier for the channel — the mobile number for sms, the
     * email otherwise.
     */
    public function channelIdentifier(): ?string
    {
        return $this->validated($this->channel()->identifierField());
    }
}
