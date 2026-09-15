<?php

namespace App\Models\Administrators\Resources;

use App\Services\Security\PiiMasker;
use Illuminate\Http\Request;

/**
 * The list representation of an administrator: the name stays clear, but the email
 * is masked so browsing the list cannot harvest colleagues' addresses. The
 * single-record show endpoint (AdministratorResource) still returns the full,
 * audited record.
 */
class AdministratorListResource extends AdministratorResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'email' => PiiMasker::maskEmail($this->email),
        ];
    }
}
