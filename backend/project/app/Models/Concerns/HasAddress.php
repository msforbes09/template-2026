<?php

namespace App\Models\Concerns;

use App\Models\Addresses\Barangays\Barangay;
use App\Models\Addresses\Countries\Country;
use App\Models\Addresses\Municipalities\Municipality;
use App\Models\Addresses\Provinces\Province;
use App\Models\Addresses\Regions\Region;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Resolves the geographic codes on a model (country_code, region_code,
 * province_code, municipality_code, barangay_code + address lines/postal) to
 * their reference records and a formatted address array.
 */
trait HasAddress
{
    /**
     * Relations to eager-load when the resolved address is exposed.
     *
     * @var list<string>
     */
    public const ADDRESS_RELATIONS = ['country', 'region', 'province', 'municipality', 'barangay'];

    /**
     * The model's country.
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'country_code', 'code');
    }

    /**
     * The model's region.
     */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_code', 'code');
    }

    /**
     * The model's province.
     */
    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class, 'province_code', 'code');
    }

    /**
     * The model's municipality/city.
     */
    public function municipality(): BelongsTo
    {
        return $this->belongsTo(Municipality::class, 'municipality_code', 'code');
    }

    /**
     * The model's barangay.
     */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class, 'barangay_code', 'code');
    }

    /**
     * The resolved address — each geographic level as `{code, name}` (or null),
     * plus the free-text lines and postal code.
     *
     * @return array<string, mixed>
     */
    public function addressArray(): array
    {
        $part = fn (?Model $model) => $model ? ['code' => $model->code, 'name' => $model->name] : null;

        return [
            'country' => $part($this->country),
            'region' => $part($this->region),
            'province' => $part($this->province),
            'municipality' => $part($this->municipality),
            'barangay' => $part($this->barangay),
            'line_one' => $this->address_line_one,
            'line_two' => $this->address_line_two,
            'postal_code' => $this->postal_code,
        ];
    }
}
