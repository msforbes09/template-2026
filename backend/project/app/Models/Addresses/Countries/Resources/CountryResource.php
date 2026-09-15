<?php

namespace App\Models\Addresses\Countries\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Country into its API representation.
 */
#[OA\Schema(
    schema: 'Country',
    type: 'object',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: 'PH'),
        new OA\Property(property: 'alpha_3_code', type: 'string', nullable: true, example: 'PHL'),
        new OA\Property(property: 'name', type: 'string', example: 'Philippines'),
        new OA\Property(property: 'nationality', type: 'string', example: 'Filipino'),
    ],
)]
class CountryResource extends JsonResource
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
            'alpha_3_code' => $this->alpha_3_code,
            'name' => $this->name,
            'nationality' => $this->nationality,
        ];
    }
}
