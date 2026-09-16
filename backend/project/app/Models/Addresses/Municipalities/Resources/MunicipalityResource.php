<?php

namespace App\Models\Addresses\Municipalities\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Municipality into its API representation.
 */
#[OA\Schema(
    schema: 'Municipality',
    type: 'object',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: '0129701000'),
        new OA\Property(property: 'region_code', type: 'string', example: '0100000000'),
        new OA\Property(property: 'province_code', type: 'string', example: '0129700000'),
        new OA\Property(property: 'name', type: 'string', example: 'Adams'),
        new OA\Property(property: 'zip_code', type: 'string', nullable: true, example: '2922'),
        new OA\Property(property: 'is_sub', type: 'integer', enum: [0, 1], example: 0),
    ],
)]
class MunicipalityResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'region_code' => $this->region_code,
            'province_code' => $this->province_code,
            'name' => $this->name,
            'zip_code' => $this->zip_code,
            'is_sub' => (int) $this->is_sub,
        ];
    }
}
