<?php

namespace Tests\Feature;

use App\Exceptions\CustomMessageException;
use App\Models\Administrators\Administrator;
use Illuminate\Auth\AuthenticationException as IlluminateAuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException as EloquentModelNotFoundException;
use Illuminate\Database\QueryException as DatabaseQueryException;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ItemNotFoundException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException as SymfonyAccessDeniedHttpException;
use Tests\TestCase;

/**
 * Feature tests for the custom JSON exception rendering layer.
 */
class ExceptionRenderingTest extends TestCase
{
    /**
     * An unknown URL renders the invalid_url envelope with a 404 status.
     */
    public function test_unknown_url_renders_invalid_url_envelope(): void
    {
        $response = $this->getJson('/this-route-does-not-exist');

        $response->assertStatus(404);
        $response->assertExactJson([
            'error' => 'invalid_url',
            'message' => 'Invalid URL.',
            'error_description' => 'Invalid URL.',
        ]);
    }

    /**
     * Calling a route with an unsupported method renders the invalid_url envelope.
     */
    public function test_method_not_allowed_renders_invalid_url_envelope(): void
    {
        Route::post('/__post_only', fn () => 'ok');

        $response = $this->getJson('/__post_only');

        $response->assertStatus(404);
        $response->assertJson(['error' => 'invalid_url']);
    }

    /**
     * A forbidden request renders the forbidden envelope with a 403 status.
     */
    public function test_access_denied_renders_forbidden_envelope(): void
    {
        Route::get('/__forbidden', fn () => throw new SymfonyAccessDeniedHttpException('nope'));

        $response = $this->getJson('/__forbidden');

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'forbidden',
            'message' => 'Forbidden.',
        ]);
    }

    /**
     * An unauthenticated request renders the unauthenticated envelope with a 401 status.
     */
    public function test_unauthenticated_renders_unauthenticated_envelope(): void
    {
        Route::get('/__unauthenticated', fn () => throw new IlluminateAuthenticationException);

        $response = $this->getJson('/__unauthenticated');

        $response->assertStatus(401);
        $response->assertJson([
            'error' => 'unauthenticated',
            'message' => 'Unauthenticated.',
        ]);
    }

    /**
     * A missing Eloquent model renders the data_not_found envelope naming the model.
     */
    public function test_model_not_found_renders_data_not_found_envelope(): void
    {
        Route::get('/__missing_model', fn () => throw (new EloquentModelNotFoundException)->setModel(Administrator::class));

        $response = $this->getJson('/__missing_model');

        $response->assertStatus(404);
        $response->assertJson([
            'error' => 'data_not_found',
            'message' => 'Administrator not found.',
        ]);
    }

    /**
     * A missing collection item renders the data_not_found envelope with a 404 status.
     */
    public function test_item_not_found_renders_data_not_found_envelope(): void
    {
        Route::get('/__missing_item', fn () => throw new ItemNotFoundException);

        $response = $this->getJson('/__missing_item');

        $response->assertStatus(404);
        $response->assertJson([
            'error' => 'data_not_found',
            'message' => 'Data record not found.',
        ]);
    }

    /**
     * A failed database query renders the data_processing_failed envelope with a 400 status.
     */
    public function test_query_exception_renders_data_processing_failed_envelope(): void
    {
        Route::get('/__bad_query', fn () => throw new DatabaseQueryException(
            'sqlite',
            'select * from missing',
            [],
            new RuntimeException('no such table'),
        ));

        $response = $this->getJson('/__bad_query');

        $response->assertStatus(400);
        $response->assertJson(['error' => 'data_processing_failed']);
    }

    /**
     * A thrown CustomMessageException renders its supplied message in the envelope.
     */
    public function test_custom_message_exception_renders_supplied_message(): void
    {
        Route::get('/__custom_message', fn () => throw new CustomMessageException('Something specific failed.'));

        $response = $this->getJson('/__custom_message');

        $response->assertStatus(400);
        $response->assertJson([
            'error' => 'custom_exception',
            'message' => 'Something specific failed.',
        ]);
    }

    /**
     * Unexpected exceptions are no longer wrapped in the custom general_exception
     * envelope (which masked every real error as one generic 400 in production).
     * They fall through to Laravel's default 500 so the actual failure surfaces
     * (and is logged) instead.
     */
    public function test_unexpected_exception_is_not_wrapped_when_debug_off(): void
    {
        config(['app.debug' => false]);

        Route::get('/__test_throw', fn () => throw new RuntimeException('kaboom'));

        $response = $this->getJson('/__test_throw');

        $response->assertStatus(500);
        $response->assertJsonMissing(['error' => 'general_exception']);
    }
}
