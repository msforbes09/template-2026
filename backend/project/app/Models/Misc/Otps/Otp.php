<?php

namespace App\Models\Misc\Otps;

use Database\Factories\Misc\Otps\OtpFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A one-time PIN record. Managed exclusively by OtpService.
 */
class Otp extends Model
{
    /** @use HasFactory<OtpFactory> */
    use HasFactory;

    use Prunable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'type',
        'identifier',
        'hashed_pin',
        'resend_token',
        'expires_at',
        'attempts',
        'resend_count',
        'locked_until',
    ];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'locked_until' => 'datetime',
        ];
    }

    /**
     * The model that owns this OTP, if any.
     *
     * @return MorphTo<Model, $this>
     */
    public function otpable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Rows eligible for pruning: expired and not currently locked.
     *
     * @return Builder<Otp>
     */
    public function prunable(): Builder
    {
        return static::query()
            ->where('expires_at', '<', now())
            ->where(function (Builder $query) {
                $query->whereNull('locked_until')->orWhere('locked_until', '<', now());
            });
    }
}
