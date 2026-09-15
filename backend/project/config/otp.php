<?php

use App\Mail\Administrators\Admin2faOtpMail;
use App\Mail\Users\AccountRecoveryOtpMail;
use App\Mail\Users\AddContactOtpMail;
use App\Mail\Users\ContactInUseMail;
use App\Mail\Users\PasswordResetNoAccountMail;
use App\Mail\Users\PasswordResetOtpMail;
use App\Mail\Users\User2faOtpMail;
use App\Mail\Users\UserAccountExistsMail;
use App\Mail\Users\UserRegistrationOtpMail;

// The platform's own name, as the recipient should see it. Read from env here
// (a config file is the one place that may) so the SMS copy below stays in step
// with `config('app.name')` — an SMS carries no other context, so every text
// must name the service that sent it.
$brand = env('APP_NAME', 'Template');

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
    // User types carry an `_email` channel suffix (paired with `_sms` below);
    // `admin_2fa` has no SMS channel, so it keeps its bare name.
    'mailables' => [
        'admin_2fa' => Admin2faOtpMail::class,
        'user_2fa_email' => User2faOtpMail::class,
        'user_registration_email' => UserRegistrationOtpMail::class,
        // Registration attempt on an already-registered email: a distinct type so
        // the shared OtpMailer (and common/otp/resend) delivers the notice, not the PIN.
        'user_registration_exists_email' => UserAccountExistsMail::class,
        // Recovery of a soft-deleted website account ("welcome back" PIN).
        'user_account_recovery_email' => AccountRecoveryOtpMail::class,
        'user_password_reset_email' => PasswordResetOtpMail::class,
        // Password reset for an email with no password account: a distinct type so
        // the shared path delivers the "no account" notice, not a reset code.
        'user_password_reset_no_account_email' => PasswordResetNoAccountMail::class,
        // Adding an email to an existing account (authenticated).
        'user_contact_email' => AddContactOtpMail::class,
        // The added email is already registered to another account: a notice, not a PIN.
        'user_contact_exists_email' => ContactInUseMail::class,
    ],

    // Maps an SMS OTP type to its message template. `:pin` is replaced with the
    // PIN; the `_exists` / `_no_account` notices intentionally carry no PIN.
    // The presence of a type here is what routes it to SMS (see SendOtp).
    'sms' => [
        'user_2fa_sms' => "Your {$brand} login code is :pin. It expires in 5 minutes. Do not share it with anyone.",
        'user_registration_sms' => "Your {$brand} verification code is :pin. It expires in 5 minutes. Do not share it with anyone.",
        'user_registration_exists_sms' => "This mobile number is already registered with {$brand}. If this was you, try logging in or resetting your password.",
        'user_account_recovery_sms' => "Welcome back! Your {$brand} account recovery code is :pin. It expires in 5 minutes. Do not share it with anyone.",
        'user_password_reset_sms' => "Your {$brand} password reset code is :pin. It expires in 5 minutes. Do not share it with anyone.",
        'user_password_reset_no_account_sms' => "No {$brand} account is linked to this mobile number. If you meant to sign up, please register first.",
        'user_contact_sms' => "Your {$brand} code to add this mobile number to your account is :pin. It expires in 5 minutes. Do not share it with anyone.",
        // Phrased without an article because the brand is configurable — the
        // surrounding grammar must hold whatever APP_NAME is set to.
        'user_contact_exists_sms' => "This mobile number is already linked to another {$brand} account, so it was not added to yours. If this wasn't you, no action is needed.",
    ],

];
