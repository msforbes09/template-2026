<?php

namespace App\Models\Addresses\Countries;

use App\Models\Concerns\Filterable;
use Illuminate\Database\Eloquent\Model;

/**
 * An ISO country reference (code, alpha-3, name, nationality).
 */
class Country extends Model
{
    use Filterable;

    /**
     * Columns allowed for ordering.
     *
     * @var list<string>
     */
    public const SORTABLE = ['id', 'name', 'code'];

    /**
     * Columns scanned by the fuzzy `search` filter.
     *
     * @var list<string>
     */
    public const SEARCHABLE = ['name', 'nationality', 'code'];

    /**
     * Columns allowed for exact-match filtering.
     *
     * @var list<string>
     */
    public const FILTERABLE = ['code'];

    /**
     * Reference table — no timestamps.
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['code', 'alpha_3_code', 'name', 'nationality'];
}
