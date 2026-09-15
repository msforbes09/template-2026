<?php

namespace Tests\Feature\Documentation;

use Tests\TestCase;

/**
 * Feature tests for the API documentation landing page that links to each
 * configured Swagger documentation group.
 */
class DocumentationIndexTest extends TestCase
{
    /**
     * The landing page responds successfully and lists a link to every
     * documentation group configured in l5-swagger.
     */
    public function test_documentation_index_lists_each_configured_group(): void
    {
        config([
            'l5-swagger.documentations' => [
                'administrators' => [
                    'api' => ['title' => 'Administrators API'],
                    'routes' => ['api' => 'api/documentation/administrators'],
                ],
                'users' => [
                    'api' => ['title' => 'Users API'],
                    'routes' => ['api' => 'api/documentation/users'],
                ],
            ],
        ]);

        $response = $this->get('/api/documentation');

        $response->assertStatus(200);
        $response->assertSee('Administrators API');
        $response->assertSee('api/documentation/administrators');
        $response->assertSee('Users API');
        $response->assertSee('api/documentation/users');
    }
}
