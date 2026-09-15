<?php

namespace App\Http\Controllers\Common\Addresses;

use App\Http\Controllers\Controller;
use App\Models\Addresses\Regions\Region;
use App\Models\Addresses\Regions\Resources\RegionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * Public list of regions.
 */
class ListRegionController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/regions',
        summary: 'List regions',
        tags: ['Addresses'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fuzzy match on name', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'code', in: 'query', description: 'Exact region code', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'order_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['code', 'name'], default: 'code')),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'], default: 'asc')),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 20, maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated regions', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Region')),
            ])),
        ],
    )]
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        return RegionResource::collection(
            Region::list($request->query() + ['order_by' => 'code', 'sort_by' => 'asc'])
        );
    }
}
