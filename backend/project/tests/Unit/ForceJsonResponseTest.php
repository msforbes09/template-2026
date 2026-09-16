<?php

namespace Tests\Unit;

use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the ForceJsonResponse middleware.
 */
class ForceJsonResponseTest extends TestCase
{
    /**
     * The middleware sets the request's Accept header to application/json.
     */
    public function test_it_forces_the_json_accept_header(): void
    {
        $middleware = new ForceJsonResponse;
        $request = Request::create('/anything', 'GET');

        $accept = null;
        $middleware->handle($request, function (Request $passed) use (&$accept) {
            $accept = $passed->headers->get('Accept');

            return new Response;
        });

        $this->assertSame('application/json', $accept);
    }

    /**
     * The middleware forwards the response returned by the next handler.
     */
    public function test_it_returns_the_next_response(): void
    {
        $middleware = new ForceJsonResponse;
        $request = Request::create('/anything', 'GET');
        $expected = new Response('body', 201);

        $result = $middleware->handle($request, fn (Request $passed) => $expected);

        $this->assertSame($expected, $result);
    }
}
