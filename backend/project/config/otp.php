<?php

use App\Mail\Administrators\Admin2faOtpMail;
use App\Mail\Users\AccountRecoveryOtpMail;
use App\Mail\Users\PasswordResetNoAccountMail;
use App\Mail\Users\PasswordResetOtpMail;
use App\Mail\Users\User2faOtpMail;
use App\Mail\Users\UserAccountExistsMail;
use App\Mail\Users\UserRegistrationOtpMail;

return [

    // Number of digits in a generated PIN.
    'length' => (int) env('OTP_LENGTH', 6),

    // Seconds a PIN remains valid.
    'ttl' => (int) env('OTP_TTL', 300),

    // Seconds required between sends (resend cooldown).
    'resend_after' => (int) env('OTP_RESEND_AFTER', 60),

    // Wrong-PIN attempts allowed before a temporary lockout.
    'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),

    // Resends allowed within one OTP session before a temporary lockout.
    'max_resends' => (int) env('OTP_MAX_RESENDS', 5),

    // Seconds an identifier is locked after exhausting attempts/resends.
    'lockout_ttl' => (int) env('OTP_LOCKOUT_TTL', 900),

    // Maps an OTP type to the Mailable used to deliver it (constructor: string $pin).
    'mailables' => [
        'admin_2fa' => Admin2faOtpMail::class,
        'user_2fa' => User2faOtpMail::class,
        'user_registration' => UserRegistrationOtpMail::class,
        // Registration attempt on an already-registered email: a distinct type so
        // the shared OtpMailer (and common/otp/resend) delivers the notice, not the PIN.
        'user_registration_exists' => UserAccountExistsMail::class,
        // Recovery of a soft-deleted website account ("welcome back" PIN).
        'user_account_recovery' => AccountRecoveryOtpMail::class,
        'user_password_reset' => PasswordResetOtpMail::class,
        // Password reset for an email with no password account: a distinct type so
        // the shared path delivers the "no account" notice, not a reset code.
        'user_password_reset_no_account' => PasswordResetNoAccountMail::class,
    ],

];
