<?php

namespace Tests\Feature\Notifications;

use App\Enums\UserStatusEnum;
use App\Models\Administrators\Administrator;
use App\Models\Broadcasts\Broadcast;
use App\Models\Notifications\Notification;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Admin broadcasts: a titled announcement fanned out to all registered users,
 * a filtered subset (type/status), or one user by uuid — persisted per
 * recipient as an `announcement` notification, recorded in the `broadcasts`
 * history with the resolved recipient count, behind the new
 * `notifications-broadcast` permission.
 */
class AdminBroadcastTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an administrator holding the given abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingAsAdmin(array $abilities = ['notifications-broadcast']): Administrator
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($admin, $abilities, 'administrators');

        return $admin;
    }

    /**
     * No targeting → every registered (non-deleted) user gets the announcement.
     */
    public function test_broadcast_to_all_registered_users(): void
    {
        $users = User::factory()->count(3)->create();
        $deleted = User::factory()->create();
        $deleted->delete();

        $this->actingAsAdmin();
        $id = $this->postJson('api/v1/administrator/broadcasts', [
            'title' => 'Scheduled maintenance',
            'body' => 'The platform will be down Saturday 02:00–04:00.',
        ])->assertCreated()->json('data.id');
        $this->postJson("api/v1/administrator/broadcasts/{$id}/start")->assertOk();

        $this->assertSame(3, Notification::query()->where('type', 'announcement')->count());

        $row = $users[0]->notifications()->where('type', 'announcement')->first();
        $this->assertSame('Scheduled maintenance', $row->data['title']);
        $this->assertSame('The platform will be down Saturday 02:00–04:00.', $row->data['body']);
        $this->assertNull($row->data['reference']);

        $broadcast = Broadcast::query()->first();
        $this->assertSame(3, $broadcast->recipients_count);
        $this->assertNotNull($broadcast->completed_at);
    }

    /**
     * The `status` filter narrows the audience.
     */
    public function test_broadcast_to_filtered_users(): void
    {
        User::factory()->create(['status' => UserStatusEnum::COMPLETED->value]);
        User::factory()->draft()->count(2)->create();

        $this->actingAsAdmin();
        $id = $this->postJson('api/v1/administrator/broadcasts', [
            'title' => 'For completed profiles',
            'body' => 'A new feature is available to you.',
            'status' => 'completed',
        ])->assertCreated()->json('data.id');
        $this->postJson("api/v1/administrator/broadcasts/{$id}/start")->assertOk();

        $this->assertSame(1, Notification::query()->where('type', 'announcement')->count());
        $this->assertSame(1, Broadcast::query()->first()->recipients_count);
    }

    /**
     * A single user by uuid gets exactly one announcement.
     */
    public function test_broadcast_to_a_single_user(): void
    {
        $target = User::factory()->create();
        User::factory()->count(2)->create();

        $this->actingAsAdmin();
        $id = $this->postJson('api/v1/administrator/broadcasts', [
            'title' => 'About your account',
            'body' => 'Please update your profile photo.',
            'user_uuid' => $target->uuid,
        ])->assertCreated()->json('data.id');
        $this->postJson("api/v1/administrator/broadcasts/{$id}/start")->assertOk();

        $this->assertSame(1, Notification::query()->where('type', 'announcement')->count());
        $this->assertNotNull($target->notifications()->where('type', 'announcement')->first());
    }

    /**
     * A single-user broadcast cannot also carry filters, and the title/body
     * are required; an unknown uuid is a 422 on the field.
     */
    public function test_validation(): void
    {
        $this->actingAsAdmin();

        $this->postJson('api/v1/administrator/broadcasts', [])
            ->assertUnprocessable()->assertJsonValidationErrors(['title', 'body']);

        $this->postJson('api/v1/administrator/broadcasts', [
            'title' => 'X', 'body' => 'Y',
            'user_uuid' => User::factory()->create()->uuid,
            'status' => 'draft',
        ])->assertUnprocessable()->assertJsonValidationErrors(['user_uuid']);

        $this->postJson('api/v1/administrator/broadcasts', [
            'title' => 'X', 'body' => 'Y',
            'user_uuid' => '00000000-0000-0000-0000-000000000000',
        ])->assertUnprocessable()->assertJsonValidationErrors(['user_uuid']);
    }

    /**
     * The endpoints require the notifications-broadcast permission.
     */
    public function test_permission_is_enforced(): void
    {
        $this->actingAsAdmin(['users-view']);

        $this->postJson('api/v1/administrator/broadcasts', ['title' => 'X', 'body' => 'Y'])->assertForbidden();
        $this->getJson('api/v1/administrator/broadcasts')->assertForbidden();
    }

    /**
     * The history lists past broadcasts, newest first, with sender + targeting.
     */
    public function test_history_list(): void
    {
        User::factory()->count(2)->create();
        $admin = $this->actingAsAdmin();

        $first = $this->postJson('api/v1/administrator/broadcasts', ['title' => 'First', 'body' => 'A.'])->json('data.id');
        $this->postJson("api/v1/administrator/broadcasts/{$first}/start")->assertOk();
        $this->postJson('api/v1/administrator/broadcasts', ['title' => 'Second', 'body' => 'B.', 'status' => 'draft']);

        $response = $this->getJson('api/v1/administrator/broadcasts')->assertOk();

        $rows = $response->json('data');
        $this->assertCount(2, $rows);
        $this->assertSame('Second', $rows[0]['title']);
        $this->assertSame(['status' => 'draft'], $rows[0]['filters']);
        $this->assertSame('draft', $rows[0]['status']);
        $this->assertSame($admin->id, $rows[0]['administrator']['id']);
        $this->assertSame('sent', $rows[1]['status']);
        $this->assertSame(2, $rows[1]['recipients_count']);
    }
}
