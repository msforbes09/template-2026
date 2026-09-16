<?php

namespace Tests\Feature\Users;

use App\Models\Addresses\Barangays\Barangay;
use App\Models\Addresses\Countries\Country;
use App\Models\Addresses\Municipalities\Municipality;
use App\Models\Addresses\Provinces\Province;
use App\Models\Addresses\Regions\Region;
use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests that the resolved address appears in the user profile + admin show.
 */
class UserAddressTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Seed reference rows and a user pointing at them.
     */
    private function makeUserWithAddress(): User
    {
        Country::create(['code' => 'PH', 'alpha_3_code' => 'PHL', 'name' => 'Philippines', 'nationality' => 'Filipino']);
        Region::create(['code' => 'R1', 'name' => 'NCR']);
        Province::create(['code' => 'P1', 'region_code' => 'R1', 'name' => 'Metro Manila']);
        Municipality::create(['code' => 'M1', 'region_code' => 'R1', 'province_code' => 'P1', 'name' => 'City of Manila']);
        Barangay::create(['code' => 'B1', 'region_code' => 'R1', 'province_code' => 'P1', 'municipality_code' => 'M1', 'name' => 'Barangay 1']);

        return User::factory()->create([
            'citizenship_code' => 'PH',
            'country_code' => 'PH',
            'region_code' => 'R1',
            'province_code' => 'P1',
            'municipality_code' => 'M1',
            'barangay_code' => 'B1',
            'address_line_one' => '123 Rizal St.',
            'postal_code' => '1000',
        ]);
    }

    /**
     * The user's own profile includes the resolved address.
     */
    public function test_profile_includes_resolved_address(): void
    {
        $user = $this->makeUserWithAddress();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->getJson('/api/v1/user/profile')
            ->assertOk()
            ->assertJsonPath('data.address.region.code', 'R1')
            ->assertJsonPath('data.address.region.name', 'NCR')
            ->assertJsonPath('data.address.municipality.name', 'City of Manila')
            ->assertJsonPath('data.address.barangay.name', 'Barangay 1')
            ->assertJsonPath('data.address.line_one', '123 Rizal St.')
            ->assertJsonPath('data.address.postal_code', '1000');
    }

    /**
     * The admin user show includes the resolved address.
     */
    public function test_admin_show_includes_resolved_address(): void
    {
        $user = $this->makeUserWithAddress();
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            ['users-view'],
            'administrators',
        );

        $this->getJson("/api/v1/administrator/users/{$user->uuid}")
            ->assertOk()
            ->assertJsonPath('data.citizenship.code', 'PH')
            ->assertJsonPath('data.citizenship.name', 'Philippines')
            ->assertJsonPath('data.address.country.name', 'Philippines')
            ->assertJsonPath('data.address.province.name', 'Metro Manila')
            ->assertJsonPath('data.address.barangay.code', 'B1');
    }

    /**
     * Unset address levels resolve to null.
     */
    public function test_missing_address_levels_are_null(): void
    {
        $user = User::factory()->create([
            'country_code' => null,
            'region_code' => null,
            'province_code' => null,
            'municipality_code' => null,
            'barangay_code' => null,
        ]);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->getJson('/api/v1/user/profile')
            ->assertOk()
            ->assertJsonPath('data.address.region', null)
            ->assertJsonPath('data.address.barangay', null);
    }
}
