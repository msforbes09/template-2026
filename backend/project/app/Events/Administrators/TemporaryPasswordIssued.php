<?php

namespace App\Events\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired when a temporary password is issued to an administrator (create or reset).
 */
class TemporaryPasswordIssued
{
    use Dispatchable;

    /**
     * @param  Administrator  $administrator  The administrator who received the password.
     * @param  string  $temporaryPassword  The plaintext temporary password.
     */
    public function __construct(
        public readonly Administrator $administrator,
        public readonly string $temporaryPassword,
    ) {}
}
