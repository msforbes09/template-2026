<?php

namespace Tests\Feature\Notifications;

use App\Services\Notifications\NotificationCopy;
use Tests\TestCase;

/**
 * Server-rendered notification text: NotificationCopy turns a stored row's
 * `type` + `data` into the `{title, message}` pair the FE renders verbatim.
 * Computed at read time (never stored) so copy changes are a code release.
 */
class NotificationCopyTest extends TestCase
{
    /**
     * The welcome pair: branded title from config('app.name'), days interpolated.
     * The welcome message instructs completing the profile — that is the actual
     * next step for a fresh registrant, not exploring the catalog.
     */
    public function test_welcome_copy(): void
    {
        $copy = NotificationCopy::render('welcome', ['reference' => null]);
        $this->assertSame('Welcome to '.config('app.name'), $copy['title']);
        $this->assertSame('Complete your profile to unlock the rest of your account.', $copy['message']);

        $copy = NotificationCopy::render('welcome.back', ['days_away' => 45, 'reference' => null]);
        $this->assertSame('Welcome back!', $copy['title']);
        $this->assertStringContainsString('45 days', $copy['message']);
    }

    /**
     * profile.completed tells the user what completion just unlocked:
     * browsing and reviewing projects.
     */
    public function test_profile_completed_copy(): void
    {
        $copy = NotificationCopy::render('profile.completed', ['reference' => null]);
        $this->assertSame('Your profile is complete', $copy['title']);
        $this->assertSame('You now have full access to your account.', $copy['message']);
    }

    /**
     * Security pair: password change warning + recovery channel.
     */
    public function test_security_copy(): void
    {
        $copy = NotificationCopy::render('security.password_changed', ['reference' => null]);
        $this->assertSame('Your password was changed', $copy['title']);
        $this->assertStringContainsString('contact our support team', $copy['message']);

        $copy = NotificationCopy::render('security.account_recovered', ['channel' => 'email', 'reference' => null]);
        $this->assertSame('Account recovered', $copy['title']);
        $this->assertStringContainsString('email', $copy['message']);
    }

    /**
     * Announcements pass the admin-authored title/body straight through.
     */
    public function test_announcement_copy_is_passthrough(): void
    {
        $copy = NotificationCopy::render('announcement', ['title' => 'Maintenance window', 'body' => 'Sunday 02:00–04:00.', 'reference' => null]);
        $this->assertSame('Maintenance window', $copy['title']);
        $this->assertSame('Sunday 02:00–04:00.', $copy['message']);
    }

    /**
     * An unknown (future/legacy) type still renders a generic title — the FE
     * never needs its own fallback copy.
     */
    public function test_unknown_type_falls_back(): void
    {
        $copy = NotificationCopy::render('something.new', ['reference' => null]);
        $this->assertSame('You have a new notification', $copy['title']);
        $this->assertNull($copy['message']);
    }

    /**
     * Missing data keys never break rendering (defensive interpolation).
     */
    public function test_missing_data_keys_render_safely(): void
    {
        $copy = NotificationCopy::render('welcome.back', []);
        $this->assertSame('Welcome back!', $copy['title']);
        $this->assertSame('Good to see you again.', $copy['message']);
    }
}
