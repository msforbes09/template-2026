<?php

namespace App\Enums;

/**
 * The authentication events written to the auth-attempt trail.
 *
 * Successes are recorded alongside failures on purpose: a run of failures followed
 * by a success is a *successful* brute-force, and a failures-only log cannot show
 * that.
 */
enum AuthEventEnum: string
{
    case SUCCEEDED = 'succeeded';

    case INVALID_CREDENTIALS = 'invalid_credentials';

    case ACCOUNT_INACTIVE = 'account_inactive';

    case INVALID_OTP = 'invalid_otp';

    case OTP_LOCKED = 'otp_locked';

    case LOGGED_OUT = 'logged_out';

    case PASSWORD_CHANGED = 'password_changed';

    case PASSWORD_RESET_REQUESTED = 'password_reset_requested';

    case REGISTRATION_STARTED = 'registration_started';

    case REGISTRATION_COMPLETED = 'registration_completed';

    case ACCOUNT_RECOVERED = 'account_recovered';

    case ACCOUNT_DELETED = 'account_deleted';
}
