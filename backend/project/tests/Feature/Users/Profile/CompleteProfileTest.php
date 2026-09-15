<?php

namespace Tests\Feature\Users\Profile;

use App\Enums\UserStatusEnum;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Completing the profile: draft -> completed with the completion stamped; the
 * submit-for-assessment application now starts from `completed` (a bare draft must
 * complete first), while a returned submission resubmits directly.
 */
class CompleteProfileTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A draft website user, optionally with the required profile fields filled.
     */
    private function draftUser(bool $complete): User
    {
        $attrs = [
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => UserStatusEnum::DRAFT->value, 'registration_method' => 'website', 'is_active' => true,
        ];

        if ($complete) {
            $attrs += [
                'company_name' => 'Acme Corp',
                'citizenship_code' => 'PH', 'region_code' => 'R1', 'province_code' => 'P1',
                'municipality_code' => 'M1', 'barangay_code' => 'B1', 'address_line_one' => '123 Main St.',
            ];
        }

        return User::create($attrs);
    }

    /**
     * A filled draft completes: status `completed`, stamp set, resource returned.
     */
    public function test_complete_profile(): void
    {
        $user = $this->draftUser(complete: true);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson('/api/v1/user/profile/complete')
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->profile_completed_at);
        // Completion seeds both cooldown clocks with the same instant.
        $this->assertSame($fresh->profile_completed_at->toDateTimeString(), $fresh->details_changed_at?->toDateTimeString());
        $this->assertSame($fresh->profile_completed_at->toDateTimeString(), $fresh->photo_changed_at?->toDateTimeString());
    }

    /**
     * An unfilled draft is refused with the missing fields listed.
     */
    public function test_incomplete_profile_refused(): void
    {
        $user = $this->draftUser(complete: false);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson('/api/v1/user/profile/complete')
            ->assertStatus(400)
            ->assertJson(['error' => 'profile_incomplete'])
            ->assertJsonPath('meta.missing', fn ($missing) => in_array('address_line_one', $missing, true));

        $this->assertSame('draft', $user->fresh()->status);
    }

    /**
     * Only a draft completes — an already-completed profile is refused.
     */
    public function test_only_draft_completes(): void
    {
        $user = $this->draftUser(complete: true);
        $user->update(['status' => UserStatusEnum::COMPLETED->value]);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson('/api/v1/user/profile/complete')
            ->assertStatus(400)->assertJson(['error' => 'invalid_status']);
    }

    /**
     * Non-website accounts cannot self-complete (their profile is externally owned).
     */
    public function test_non_website_account_refused(): void
    {
        Sanctum::actingAs(User::factory()->draft()->create(['registration_method' => 'external']), ['*'], 'users');

        $this->postJson('/api/v1/user/profile/complete')
            ->assertStatus(403)->assertJson(['error' => 'profile_not_editable']);
    }
}
