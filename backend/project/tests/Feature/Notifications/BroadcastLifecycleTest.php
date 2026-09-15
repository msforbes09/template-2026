<?php

namespace Tests\Feature\Notifications;

use App\Models\Administrators\Administrator;
use App\Models\Broadcasts\Broadcast;
use App\Models\Notifications\Notification;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The broadcast lifecycle: created as a DRAFT (nothing delivered), editable
 * and soft-deletable by its creator only while draft, then explicitly started
 * (draft → sending → sent) — after which it is immutable. Only the creator
 * may edit, delete, or start; another admin gets 403 broadcast_not_owned.
 */
class BroadcastLifecycleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an administrator holding the broadcast permission.
     */
    private function actingAsAdmin(): Administrator
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($admin, ['notifications-broadcast'], 'administrators');

        return $admin;
    }

    /**
     * A draft owned by the given admin.
     */
    private function draft(Administrator $admin): Broadcast
    {
        return Broadcast::query()->create([
            'administrator_id' => $admin->getKey(),
            'title' => 'Draft title',
            'body' => 'Draft body.',
        ]);
    }

    /**
     * Creation stores a draft and delivers nothing.
     */
    public function test_create_is_a_draft_and_delivers_nothing(): void
    {
        User::factory()->count(2)->create();

        $this->actingAsAdmin();
        $response = $this->postJson('api/v1/administrator/broadcasts', ['title' => 'X', 'body' => 'Y.'])->assertCreated();

        $this->assertSame('draft', $response->json('data.status'));
        $this->assertNull($response->json('data.started_at'));
        $this->assertSame(0, Notification::query()->count());
        $this->assertNull(Broadcast::query()->first()->recipients_count);
    }

    /**
     * Start delivers and lands on `sent`; a second start is refused.
     */
    public function test_start_delivers_once(): void
    {
        User::factory()->count(2)->create();
        $admin = $this->actingAsAdmin();
        $broadcast = $this->draft($admin);

        $this->postJson("api/v1/administrator/broadcasts/{$broadcast->id}/start")->assertOk();

        $broadcast->refresh();
        $this->assertSame('sent', $broadcast->status);
        $this->assertNotNull($broadcast->started_at);
        $this->assertSame(2, $broadcast->recipients_count);
        $this->assertSame(2, Notification::query()->where('type', 'announcement')->count());

        $this->postJson("api/v1/administrator/broadcasts/{$broadcast->id}/start")
            ->assertBadRequest()->assertJsonPath('error', 'invalid_status');
    }

    /**
     * A draft is editable (message + retargeting); a started one is not.
     */
    public function test_only_a_draft_is_editable(): void
    {
        $admin = $this->actingAsAdmin();
        $broadcast = $this->draft($admin);

        $this->putJson("api/v1/administrator/broadcasts/{$broadcast->id}", [
            'title' => 'New title', 'body' => 'New body.', 'status' => 'draft',
        ])->assertOk();

        $broadcast->refresh();
        $this->assertSame('New title', $broadcast->title);
        $this->assertSame(['status' => 'draft'], $broadcast->filters);

        $broadcast->start();

        $this->putJson("api/v1/administrator/broadcasts/{$broadcast->id}", [
            'title' => 'Too late', 'body' => 'Nope.',
        ])->assertBadRequest()->assertJsonPath('error', 'invalid_status');
    }

    /**
     * A draft can be soft-deleted (and leaves the history); a started one cannot.
     */
    public function test_only_a_draft_is_deletable_softly(): void
    {
        $admin = $this->actingAsAdmin();
        $broadcast = $this->draft($admin);

        $this->deleteJson("api/v1/administrator/broadcasts/{$broadcast->id}")->assertOk();
        $this->assertNotNull(Broadcast::withTrashed()->find($broadcast->id)->deleted_at);
        $this->assertCount(0, $this->getJson('api/v1/administrator/broadcasts')->json('data'));

        $started = $this->draft($admin);
        $started->start();

        $this->deleteJson("api/v1/administrator/broadcasts/{$started->id}")
            ->assertBadRequest()->assertJsonPath('error', 'invalid_status');
    }

    /**
     * Only the creator manages and starts — another admin (same permission)
     * gets 403 broadcast_not_owned.
     */
    public function test_only_the_creator_manages_and_starts(): void
    {
        $creator = Administrator::factory()->create(['with_temporary_password' => false]);
        $broadcast = $this->draft($creator);

        $this->actingAsAdmin(); // a different admin

        $this->putJson("api/v1/administrator/broadcasts/{$broadcast->id}", ['title' => 'X', 'body' => 'Y.'])
            ->assertForbidden()->assertJsonPath('error', 'broadcast_not_owned');
        $this->deleteJson("api/v1/administrator/broadcasts/{$broadcast->id}")
            ->assertForbidden()->assertJsonPath('error', 'broadcast_not_owned');
        $this->postJson("api/v1/administrator/broadcasts/{$broadcast->id}/start")
            ->assertForbidden()->assertJsonPath('error', 'broadcast_not_owned');

        $this->assertSame('draft', $broadcast->fresh()->status);
    }
}
