<?php

namespace Tests\Feature\Users\Profile;

use App\Enums\FileEnum;
use App\Models\Addresses\Barangays\Barangay;
use App\Models\Addresses\Countries\Country;
use App\Models\Addresses\Municipalities\Municipality;
use App\Models\Addresses\Provinces\Province;
use App\Models\Addresses\Regions\Region;
use App\Models\Misc\Files\File;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests for the self-service profile update.
 */
class UpdateProfileTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Seed the address reference rows the payload validates against.
     */
    private function seedAddresses(): void
    {
        Country::create(['code' => 'PH', 'name' => 'Philippines', 'nationality' => 'Filipino']);
        Region::create(['code' => 'R1', 'name' => 'NCR']);
        Province::create(['code' => 'P1', 'region_code' => 'R1', 'name' => 'Metro Manila']);
        Municipality::create(['code' => 'M1', 'region_code' => 'R1', 'province_code' => 'P1', 'name' => 'Manila']);
        Barangay::create(['code' => 'B1', 'region_code' => 'R1', 'province_code' => 'P1', 'municipality_code' => 'M1', 'name' => 'Barangay 1']);
    }

    /**
     * A valid full payload.
     *
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Alex', 'last_name' => 'Rivera',
            'middle_name' => 'Lee', 'suffix_name' => null,
            'company_name' => 'Acme Corp',
            'birth_date' => '1990-01-01', 'gender' => 'male',
            'citizenship_code' => 'PH', 'region_code' => 'R1',
            'province_code' => 'P1', 'municipality_code' => 'M1', 'barangay_code' => 'B1',
            'address_line_one' => '123 Rizal St.', 'address_line_two' => null, 'postal_code' => '1000',
        ], $overrides);
    }

    /**
     * A draft website user with the given status/registration method.
     */
    private function draftUser(string $status = 'draft', string $method = 'website'): User
    {
        return User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => $status, 'registration_method' => $method, 'is_active' => true,
        ]);
    }

    /**
     * A draft website user updates their profile successfully.
     */
    public function test_draft_website_user_updates_profile(): void
    {
        $this->seedAddresses();
        $user = $this->draftUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->putJson('/api/v1/user/profile', $this->payload(['company_name' => 'Globe Telecom']))->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('Lee', $fresh->middle_name);
        $this->assertSame('Globe Telecom', $fresh->company_name);
        $this->assertSame('male', $fresh->gender);
        $this->assertSame('1990-01-01', $fresh->birth_date);
        $this->assertSame('B1', $fresh->barangay_code);
    }

    /**
     * The photo moved to its own endpoint (PATCH /profile/photo) — a photo_uuid
     * in the profile payload is ignored like the privilege fields, never
     * validated and never applied.
     */
    public function test_photo_uuid_is_ignored(): void
    {
        $this->seedAddresses();
        $user = $this->draftUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $other = User::create(['email' => 'other@example.com', 'first_name' => 'O', 'last_name' => 'X', 'is_active' => true]);
        $foreign = File::factory()->create([
            'visibility' => FileEnum::VISIBILITY['PRIVATE'],
            'owner_type' => $other->getMorphClass(), 'owner_id' => $other->getKey(),
        ]);

        $this->putJson('/api/v1/user/profile', $this->payload(['photo_uuid' => $foreign->uuid]))->assertOk();

        $this->assertNull($user->fresh()->photo_uuid);
    }

    /**
     * A non-website user is forbidden from self-editing.
     */
    public function test_non_website_user_is_forbidden(): void
    {
        $this->seedAddresses();
        $user = $this->draftUser('draft', 'external'); // draft status but non-website method
        Sanctum::actingAs($user, ['*'], 'users');

        $this->putJson('/api/v1/user/profile', $this->payload())
            ->assertStatus(403)->assertJson(['error' => 'profile_not_editable']);
    }

    /**
     * Privilege fields in the body are ignored (not mass-assigned).
     */
    public function test_privilege_fields_are_ignored(): void
    {
        $this->seedAddresses();
        $user = $this->draftUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->putJson('/api/v1/user/profile', $this->payload([
            'status' => 'approved', 'is_active' => false, 'email' => 'evil@example.com',
        ]))->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('draft', $fresh->status);
        $this->assertTrue((bool) $fresh->is_active);
        $this->assertSame('user@example.com', $fresh->email);
    }

    /**
     * Invalid values are rejected as validation errors.
     */
    public function test_validation_rejects_bad_values(): void
    {
        $this->seedAddresses();
        $user = $this->draftUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->putJson('/api/v1/user/profile', $this->payload([
            'gender' => 'other', 'region_code' => 'NOPE', 'birth_date' => now()->addDay()->format('Y-m-d'),
        ]))->assertStatus(422)->assertJsonValidationErrors(['gender', 'region_code', 'birth_date']);
    }

    /**
     * GET /profile now surfaces birth_date, gender, and resolved citizenship.
     */
    public function test_profile_view_includes_new_fields(): void
    {
        $this->seedAddresses();
        $user = $this->draftUser();
        $user->update(['birth_date' => '1990-01-01', 'gender' => 'male', 'citizenship_code' => 'PH', 'company_name' => 'Acme Corp', 'mobile_number' => '+639171234567']);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->getJson('/api/v1/user/profile')
            ->assertOk()
            ->assertJsonPath('data.birth_date', '1990-01-01')
            ->assertJsonPath('data.gender', 'male')
            ->assertJsonPath('data.company_name', 'Acme Corp')
            ->assertJsonPath('data.mobile_number', '+639171234567')
            ->assertJsonPath('data.citizenship.code', 'PH')
            ->assertJsonPath('data.citizenship.nationality', 'Filipino');
    }

    /**
     * Citizenship (nationality) is required — it is never auto-defaulted like the
     * address country.
     */
    public function test_citizenship_is_required(): void
    {
        $this->seedAddresses();
        $user = $this->draftUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $payload = $this->payload();
        unset($payload['citizenship_code']);

        $this->putJson('/api/v1/user/profile', $payload)
            ->assertStatus(422)->assertJsonValidationErrors(['citizenship_code']);
    }
}
