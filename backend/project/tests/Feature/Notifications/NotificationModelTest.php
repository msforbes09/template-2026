<?php

namespace Tests\Feature\Notifications;

use App\Models\Notifications\Notification;
use App\Models\Users\User;
use App\Notifications\Users\AccountRecoveredNotification;
use App\Notifications\Users\PasswordChangedNotification;
use App\Notifications\Users\WelcomeBackNotification;
use App\Notifications\Users\WelcomeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The notification model + classes hold the platform conventions: short stable
 * `type` strings (never FQCNs), an always-present `reference` key for FE deep
 * links, an auto-increment integer id, and a lean searchable document whose
 * fields match the declared OpenSearch mapping.
 */
class NotificationModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * One instance of every notification class, keyed by its expected stored type.
     *
     * @return array<string, object>
     */
    private function allNotifications(): array
    {
        return [
            'welcome' => new WelcomeNotification,
            'welcome.back' => new WelcomeBackNotification(45),
            'security.password_changed' => new PasswordChangedNotification,
            'security.account_recovered' => new AccountRecoveredNotification('email'),
        ];
    }

    /**
     * Every class stores a short dotted type — never a class name.
     */
    public function test_database_types_are_short_stable_strings(): void
    {
        $user = User::factory()->create();

        foreach ($this->allNotifications() as $expected => $notification) {
            $this->assertSame($expected, $notification->databaseType($user), $notification::class);
            $this->assertStringNotContainsString('\\', $notification->databaseType($user));
        }
    }

    /**
     * Every payload carries a `reference` key (possibly null) so the FE never
     * branches on key existence.
     */
    public function test_every_payload_carries_a_reference_key(): void
    {
        $user = User::factory()->create();

        foreach ($this->allNotifications() as $type => $notification) {
            $data = $notification->toDatabase($user);

            $this->assertArrayHasKey('reference', $data, $type);
        }
    }

    /**
     * Storing through the channel produces an auto-increment integer id row with
     * the short type and array data.
     */
    public function test_stored_row_uses_an_integer_id(): void
    {
        $user = User::factory()->create();

        $user->notify(new WelcomeNotification);

        $row = Notification::query()->first();
        $this->assertIsInt($row->id);
        $this->assertSame('welcome', $row->type);
        $this->assertNull($row->read_at);
        $this->assertIsArray($row->data);
        $this->assertSame('User', $row->notifiable_type);
    }

    /**
     * The searchable document's fields exactly match the declared mapping, and
     * the payload `data` stays out of the index.
     */
    public function test_searchable_document_matches_mapping(): void
    {
        $user = User::factory()->create();
        $user->notify(new WelcomeNotification);

        $row = Notification::query()->first();
        $document = $row->toSearchableArray();

        $this->assertSame(array_keys(Notification::searchableMapping()), array_keys($document));
        $this->assertArrayNotHasKey('data', $document);
        $this->assertSame('template_notifications', $row->searchableAs());
    }
}
