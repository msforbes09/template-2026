<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Collection;

/**
 * Renders the API documentation landing page linking to each Swagger
 * documentation group configured in l5-swagger.
 */
class DocumentationIndexController extends Controller
{
    /**
     * Build the list of documentation groups from config and render the index view.
     */
    public function __invoke(): View
    {
        $groups = Collection::make(config('l5-swagger.documentations', []))
            ->map(fn (array $config, string $name): array => [
                'name' => $name,
                'title' => $config['api']['title'] ?? $name,
                'url' => url($config['routes']['api'] ?? ''),
            ])
            ->values()
            ->all();

        return view('documentation.index', ['groups' => $groups]);
    }
}
