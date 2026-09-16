<?php

namespace App\Models\Misc\PasswordHistories;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A password hash previously (or currently) held by an administrator or user.
 * Written by `HasPasswordHistory` whenever a password is set; never edited.
 */
class PasswordHistory extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'owner_type',
        'owner_id',
        'password',
    ];

    /**
     * The administrator or user this hash belonged to.
     *
     * @return MorphTo<Model, $this>
     */
    public function owner(): MorphTo
    {
        return $this->morphTo();
    }
}
