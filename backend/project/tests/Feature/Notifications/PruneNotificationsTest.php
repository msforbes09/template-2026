<?php

namespace Tests\Feature\Notifications;

use App\Models\Notifications\Notification;
use App\Models\Users\User;
use App\Notifications\Users\WelcomeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * `notifications:prune` deletes rows older than the retention window (both
 * stores — model deletes so Scout observes), with the window clamped so a
 * set-but-empty env can never become a delete-everything sweep.
 */
class PruneNotificationsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Rows past the retention window go; newer rows stay.
     */
    public function test_prunes_only_rows_past_retention(): void
    {
        config(['notifications.retention_months' => 12]);
        $user = User::factory()->create();
        $user->notify(new WelcomeNotification);
        $user->notify(new WelcomeNotification);

        Notification::query()->latest('id')->first()->forceFill(['created_at' => now()->subMonths(13)])->save();

        $this->artisan('notifications:prune')->assertExitCode(0);

        $this->assertSame(1, Notification::query()->count());
        $this->assertTrue(Notification::query()->first()->created_at->gt(now()->subMonth()));
    }

    /**
     * A zero/empty retention config is clamped to at least one month.
     */
    public function test_retention_is_clamped(): void
    {
        config(['notifications.retention_months' => 0]);
        $user = User::factory()->create();
        $user->notify(new WelcomeNotification);

        Notification::query()->first()->forceFill(['created_at' => now()->subDays(20)])->save();

        $this->artisan('notifications:prune')->assertExitCode(0);

        // 20 days old survives a clamped 1-month window.
        $this->assertSame(1, Notification::query()->count());
    }
}
