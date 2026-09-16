<?php

namespace Tests\Feature\Notifications;

use App\Events\Notifications\NotificationCreated;
use App\Models\Users\User;
use App\Notifications\Users\WelcomeBackNotification;
use App\Notifications\Users\WelcomeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The user notification API: an own-scoped list with unread meta and
 * filters, idempotent mark-read (single + all), a freeze exemption so a
 * suspended user can still dismiss the suspension notice, and the realtime
 * `notification.created` broadcast on the user's own channel.
 */
class NotificationEndpointsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The list returns only the caller's notifications, newest first, with the
     * unread count in meta.
     */
    public function test_list_is_own_scoped_with_unread_meta(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $user->notify(new WelcomeNotification);
        $user->notify(new WelcomeNotification);
        $other->notify(new WelcomeNotification);
        $user->notifications()->latest('id')->first()->markAsRead();

        Sanctum::actingAs($user, ['*'], 'users');
        $response = $this->getJson('api/v1/user/notifications')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(1, $response->json('meta.unread_count'));
    }

    /**
     * `?unread=1` narrows to unread rows; `?type=` narrows to one type.
     */
    public function test_list_filters(): void
    {
        $user = User::factory()->create();
        $user->notify(new WelcomeNotification);
        $user->notify(new WelcomeBackNotification(45));
        $user->notifications()->where('type', 'welcome')->first()->markAsRead();

        Sanctum::actingAs($user, ['*'], 'users');

        $unread = $this->getJson('api/v1/user/notifications?unread=1')->assertOk()->json('data');
        $this->assertCount(1, $unread);
        $this->assertSame('welcome.back', $unread[0]['type']);

        $typed = $this->getJson('api/v1/user/notifications?type=welcome')->assertOk()->json('data');
        $this->assertCount(1, $typed);
        $this->assertSame('welcome', $typed[0]['type']);
    }

    /**
     * Mark one read: idempotent, and a foreign id is a 404.
     */
    public function test_mark_one_read(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $user->notify(new WelcomeNotification);
        $other->notify(new WelcomeNotification);
        $mine = $user->notifications()->first();
        $theirs = $other->notifications()->first();

        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson("api/v1/user/notifications/{$mine->id}/read")->assertOk();
        $this->assertNotNull($mine->fresh()->read_at);

        // Idempotent re-read.
        $this->postJson("api/v1/user/notifications/{$mine->id}/read")->assertOk();

        // Someone else's notification is not yours to touch.
        $this->postJson("api/v1/user/notifications/{$theirs->id}/read")->assertNotFound();
        $this->assertNull($theirs->fresh()->read_at);
    }

    /**
     * Mark all read returns the affected count and leaves nothing unread.
     */
    public function test_mark_all_read(): void
    {
        $user = User::factory()->create();
        $user->notify(new WelcomeNotification);
        $user->notify(new WelcomeNotification);

        Sanctum::actingAs($user, ['*'], 'users');
        $this->postJson('api/v1/user/notifications/read-all')->assertOk()->assertJsonPath('data.marked', 2);

        $this->assertSame(0, $user->notifications()->whereNull('read_at')->count());
    }

    /**
     * The list requires authentication.
     */
    public function test_list_requires_auth(): void
    {
        $this->getJson('api/v1/user/notifications')->assertUnauthorized();
    }

    /**
     * Storing a notification broadcasts `notification.created` on the user's
     * own private channel.
     */
    public function test_notification_broadcasts_on_the_user_channel(): void
    {
        Event::fake([NotificationCreated::class]);
        $user = User::factory()->create();

        $user->notify(new WelcomeNotification);

        Event::assertDispatched(NotificationCreated::class, function (NotificationCreated $event) use ($user) {
            return $event->broadcastOn()->name === 'private-user.'.$user->uuid
                && $event->broadcastAs() === 'notification.created'
                && $event->broadcastWith()['type'] === 'welcome';
        });
    }

    /**
     * Every listed notification carries the server-rendered `title` and
     * `message` pair, so the FE renders text verbatim instead of templating.
     */
    public function test_list_carries_server_rendered_title_and_message(): void
    {
        $user = User::factory()->create();
        $user->notify(new WelcomeNotification);

        Sanctum::actingAs($user, ['*'], 'users');
        $row = $this->getJson('api/v1/user/notifications')->assertOk()->json('data.0');

        $this->assertSame('Welcome to '.config('app.name'), $row['title']);
        $this->assertSame('Complete your profile to unlock the rest of your account.', $row['message']);
    }

    /**
     * The realtime payload carries the same server-rendered text as the list.
     */
    public function test_broadcast_payload_carries_title_and_message(): void
    {
        Event::fake([NotificationCreated::class]);
        $user = User::factory()->create();

        $user->notify(new WelcomeNotification);

        Event::assertDispatched(NotificationCreated::class, function (NotificationCreated $event) {
            return $event->broadcastWith()['title'] === 'Welcome to '.config('app.name')
                && $event->broadcastWith()['message'] === 'Complete your profile to unlock the rest of your account.';
        });
    }
}
