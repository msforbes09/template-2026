<?php

namespace App\Models\Addresses\Provinces\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Province into its API representation.
 */
#[OA\Schema(
    schema: 'Province',
    type: 'object',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: '0129700000'),
        new OA\Property(property: 'region_code', type: 'string', example: '0100000000'),
        new OA\Property(property: 'name', type: 'string', example: 'Ilocos Norte'),
    ],
)]
class ProvinceResource extends JsonResource
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
            'name' => $this->name,
        ];
    }
}
