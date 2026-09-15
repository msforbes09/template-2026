<?php

namespace App\Http\Controllers\Common\Addresses;

use App\Http\Controllers\Controller;
use App\Models\Addresses\Countries\Country;
use App\Models\Addresses\Countries\Resources\CountryResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * Public list of countries.
 */
class ListCountryController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/countries',
        summary: 'List countries',
        tags: ['Addresses'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fuzzy match on name/nationality/code', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'code', in: 'query', description: 'Exact ISO code', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'order_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['id', 'name', 'code'], default: 'id')),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'], default: 'asc')),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 20, maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated countries', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Country')),
            ])),
        ],
    )]
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        // Default to id ascending (Philippines first) — overridable by query params.
        return CountryResource::collection(
            Country::list($request->query() + ['order_by' => 'id', 'sort_by' => 'asc'])
        );
    }
}
