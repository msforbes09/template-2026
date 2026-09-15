<?php

namespace App\Models\Addresses\Regions;

use App\Models\Concerns\Filterable;
use Illuminate\Database\Eloquent\Model;

/**
 * A PSGC region reference (code + name).
 */
class Region extends Model
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
    public const FILTERABLE = ['code'];

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
    protected $fillable = ['code', 'correspondence_code', 'name'];
}
