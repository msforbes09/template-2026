<?php

namespace App\Models\Addresses\Municipalities;

use App\Models\Concerns\Filterable;
use Illuminate\Database\Eloquent\Model;

/**
 * A PSGC municipality/city reference (code + region/province codes + name).
 */
class Municipality extends Model
{
    use Filterable;

    /**
     * Columns allowed for ordering.
     *
     * @var list<string>
     */
    public const SORTABLE = ['code', 'name'];

    /**
     * Columns scanned by the fuzzy `search` filter.
     *
     * @var list<string>
     */
    public const SEARCHABLE = ['name'];

    /**
     * Columns allowed for exact-match filtering.
     *
     * @var list<string>
     */
    public const FILTERABLE = ['code', 'region_code', 'province_code'];

    /**
     * The `code` string is the primary key.
     */
    protected $primaryKey = 'code';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['code', 'correspondence_code', 'region_code', 'province_code', 'name', 'zip_code', 'is_sub'];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['is_sub' => 'boolean'];
    }
}
