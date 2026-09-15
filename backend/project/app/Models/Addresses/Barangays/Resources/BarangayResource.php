<?php

namespace App\Models\Addresses\Barangays\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Barangay into its API representation.
 */
#[OA\Schema(
    schema: 'Barangay',
    type: 'object',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: '0129701001'),
        new OA\Property(property: 'region_code', type: 'string', example: '0100000000'),
        new OA\Property(property: 'province_code', type: 'string', example: '0129700000'),
        new OA\Property(property: 'municipality_code', type: 'string', example: '0129701000'),
        new OA\Property(property: 'name', type: 'string', example: 'Adams (Pob.)'),
        new OA\Property(property: 'zip_code', type: 'string', nullable: true, example: '2922'),
    ],
)]
class BarangayResource extends JsonResource
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
            'municipality_code' => $this->municipality_code,
            'name' => $this->name,
            'zip_code' => $this->zip_code,
        ];
    }
}
