<?php

namespace Tests\Feature\Notifications;

use App\Enums\AuthChannelEnum;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Security-relevant account changes land in the notification center so the
 * user sees them at next login even if the actor was not them: a password
 * change/reset, and a soft-deleted account being recovered.
 */
class SecurityNotificationsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A password change → `security.password_changed`.
     */
    public function test_password_change_notifies(): void
    {
        $user = User::factory()->create();

        $user->updatePassword('N3w-secret-password!');

        $this->assertNotNull($user->notifications()->where('type', 'security.password_changed')->first());
    }

    /**
     * Account recovery → `security.account_recovered` carrying the channel.
     */
    public function test_account_recovery_notifies(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->delete();

        $user->recoverAccount('N3w-secret-password!', AuthChannelEnum::EMAIL);

        $row = $user->notifications()->where('type', 'security.account_recovered')->first();
        $this->assertNotNull($row);
        $this->assertSame('email', $row->data['channel']);
    }
}
