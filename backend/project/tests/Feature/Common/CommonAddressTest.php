<?php

namespace Tests\Feature\Common;

use App\Models\Addresses\Barangays\Barangay;
use App\Models\Addresses\Countries\Country;
use App\Models\Addresses\Municipalities\Municipality;
use App\Models\Addresses\Provinces\Province;
use App\Models\Addresses\Regions\Region;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the public (common) address reference endpoints.
 */
class CommonAddressTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Countries are listed publicly.
     */
    public function test_lists_countries(): void
    {
        Country::create(['code' => 'PH', 'alpha_3_code' => 'PHL', 'name' => 'Philippines', 'nationality' => 'Filipino']);

        $this->getJson('/api/v1/common/countries')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'PH')
            ->assertJsonPath('data.0.name', 'Philippines');
    }

    /**
     * Regions are listed publicly.
     */
    public function test_lists_regions(): void
    {
        Region::create(['code' => '1300000000', 'name' => 'NCR']);

        $this->getJson('/api/v1/common/regions')
            ->assertOk()
            ->assertJsonPath('data.0.code', '1300000000');
    }

    /**
     * Provinces are filterable by region.
     */
    public function test_provinces_filter_by_region(): void
    {
        Province::create(['code' => 'P1', 'region_code' => 'R1', 'name' => 'Prov One']);
        Province::create(['code' => 'P2', 'region_code' => 'R2', 'name' => 'Prov Two']);

        $this->getJson('/api/v1/common/provinces?region_code=R1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'P1');
    }

    /**
     * Municipalities are filterable by province.
     */
    public function test_municipalities_filter_by_province(): void
    {
        Municipality::create(['code' => 'M1', 'region_code' => 'R1', 'province_code' => 'P1', 'name' => 'City One']);
        Municipality::create(['code' => 'M2', 'region_code' => 'R1', 'province_code' => 'P2', 'name' => 'City Two']);

        $this->getJson('/api/v1/common/municipalities?province_code=P1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'M1');
    }

    /**
     * Barangays are filterable by municipality.
     */
    public function test_barangays_filter_by_municipality(): void
    {
        Barangay::create(['code' => 'B1', 'region_code' => 'R1', 'province_code' => 'P1', 'municipality_code' => 'M1', 'name' => 'Brgy One']);
        Barangay::create(['code' => 'B2', 'region_code' => 'R1', 'province_code' => 'P1', 'municipality_code' => 'M2', 'name' => 'Brgy Two']);

        $this->getJson('/api/v1/common/barangays?municipality_code=M1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'B1');
    }
}
