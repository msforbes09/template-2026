<?php

namespace App\Models\Users\Resources;

use App\Services\Security\PiiMasker;
use Illuminate\Http\Request;

/**
 * The list representation of a user: names stay clear (so admins can identify
 * and search), but contact PII is masked and birth date / gender are dropped, so
 * browsing the list cannot harvest everyone's full details. The single-record
 * show endpoint (UserResource) still returns the full, audited record.
 */
class UserListResource extends UserResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        $data['email'] = PiiMasker::maskEmail($this->email);
        $data['mobile_number'] = PiiMasker::maskMobile($this->mobile_number);

        unset($data['birth_date'], $data['gender']);

        return $data;
    }
}
