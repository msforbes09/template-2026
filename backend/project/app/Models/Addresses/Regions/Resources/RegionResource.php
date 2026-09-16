<?php

namespace App\Models\Addresses\Regions\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Region into its API representation.
 */
#[OA\Schema(
    schema: 'Region',
    type: 'object',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: '1300000000'),
        new OA\Property(property: 'name', type: 'string', example: 'National Capital Region (NCR)'),
    ],
)]
class RegionResource extends JsonResource
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
            'name' => $this->name,
        ];
    }
}
