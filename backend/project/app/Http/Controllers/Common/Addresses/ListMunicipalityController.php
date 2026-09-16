<?php

namespace App\Http\Controllers\Common\Addresses;

use App\Http\Controllers\Controller;
use App\Models\Addresses\Municipalities\Municipality;
use App\Models\Addresses\Municipalities\Resources\MunicipalityResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * Public list of municipalities/cities (filterable by region/province).
 */
class ListMunicipalityController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/municipalities',
        summary: 'List municipalities/cities',
        tags: ['Addresses'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fuzzy match on name', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'region_code', in: 'query', description: 'Filter by region', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'province_code', in: 'query', description: 'Filter by province', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'code', in: 'query', description: 'Exact municipality code', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'order_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['code', 'name'], default: 'code')),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'], default: 'asc')),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 20, maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated municipalities', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Municipality')),
            ])),
        ],
    )]
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        return MunicipalityResource::collection(
            Municipality::list($request->query() + ['order_by' => 'code', 'sort_by' => 'asc'])
        );
    }
}
