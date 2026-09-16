<?php

namespace App\Models\Documentations;

use App\Models\Concerns\Filterable;
use Database\Factories\Documentations\DocumentationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * An admin-managed documentation block addressed by a slug identifier.
 */
class Documentation extends Model implements Auditable
{
    use AuditableTrait;
    use Filterable;

    /** @use HasFactory<DocumentationFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * Columns that may be used to order the list (`order_by`).
     *
     * @var list<string>
     */
    public const SORTABLE = ['id', 'identifier', 'created_at', 'updated_at'];

    /**
     * Columns scanned by the fuzzy `search` filter.
     *
     * @var list<string>
     */
    public const SEARCHABLE = ['identifier'];

    /**
     * Columns allowed for exact-match filtering.
     *
     * @var list<string>
     */
    public const FILTERABLE = ['identifier'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['identifier', 'body', 'meta'];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['body' => 'array', 'meta' => 'array'];
    }
}
