<?php

namespace App\Models\Administrators\Resources;

use App\Models\Misc\Files\Resources\FileResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The authenticated administrator's own profile representation.
 * (A `permissions` array will be added here later.)
 */
class AdministratorProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'photo' => $this->photo ? FileResource::make($this->photo) : null,
            'is_active' => (int) $this->is_active,
            'with_temporary_password' => (int) $this->with_temporary_password,
            'last_login_at' => $this->last_login_at?->format('Y-m-d H:i:s'),
            'password_changed_at' => $this->password_changed_at?->format('Y-m-d H:i:s'),
            'password_expires_at' => $this->passwordExpiresAt()?->format('Y-m-d H:i:s'),
            'is_password_expired' => (int) $this->isPasswordExpired(),
            'password_expiry_waives_remaining' => $this->passwordExpiryWaivesRemaining(),
            // The session window as the server sees it: `refresh.token` has just slid
            // the expiry, so this is exactly when an idle client will be signed out.
            'session_inactivity_minutes' => (int) config('auth.administrators.token_inactivity_minutes', 60),
            'token_expires_at' => $this->tokenExpiresAt()?->format('Y-m-d H:i:s'),
            'permissions' => $this->currentAccessToken()?->abilities ?? [],
        ];
    }
}
