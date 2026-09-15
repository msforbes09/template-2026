<?php

namespace Tests\Feature\Security;

use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The `api` middleware group carries a default rate limiter (`throttle:api`), so
 * every /api/v1/* route is limited by default — a fail-safe backstop. It is keyed
 * per authenticated principal (else IP), exempts CORS preflight, and the tight
 * per-route limiters still stack on top and govern where they apply.
 */
class ApiDefaultThrottleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A benign authed endpoint is throttled once the account passes the group limit.
     */
    public function test_group_default_throttles_past_the_limit(): void
    {
        config(['api.rate_limit' => 3]);
        Sanctum::actingAs(User::factory()->create(), ['*'], 'users');

        for ($i = 0; $i < 3; $i++) {
            $this->getJson('/api/v1/user/profile')->assertOk();
        }

        $this->getJson('/api/v1/user/profile')
            ->assertStatus(429)
            ->assertJsonPath('error', 'too_many_requests');
    }

    /**
     * Two different accounts do not share a bucket (keyed per principal).
     */
    public function test_buckets_are_per_principal(): void
    {
        config(['api.rate_limit' => 2]);
        $a = User::factory()->create();
        $b = User::factory()->create();

        Sanctum::actingAs($a, ['*'], 'users');
        $this->getJson('/api/v1/user/profile')->assertOk();
        $this->getJson('/api/v1/user/profile')->assertOk();
        $this->getJson('/api/v1/user/profile')->assertStatus(429); // A is spent

        Sanctum::actingAs($b, ['*'], 'users');
        $this->getJson('/api/v1/user/profile')->assertOk(); // B has its own bucket
    }

    /**
     * A tight per-route limiter still governs where it applies (it stacks on top of
     * the generous group default and trips first).
     */
    public function test_named_route_limiter_still_governs(): void
    {
        config(['api.rate_limit' => 100]); // group default well above the route limit

        // register is throttle:register (5/min); the 6th trips regardless of the
        // generous group default.
        $statuses = [];
        for ($i = 0; $i < 7; $i++) {
            $statuses[] = $this->postJson('/api/v1/user/register', [])->getStatusCode();
        }

        $this->assertContains(429, $statuses);
    }

    /**
     * CORS preflight (OPTIONS) is never throttled by the group default.
     */
    public function test_options_preflight_is_not_throttled(): void
    {
        config(['api.rate_limit' => 1]);

        for ($i = 0; $i < 4; $i++) {
            $status = $this->call('OPTIONS', '/api/v1/user/profile')->getStatusCode();
            $this->assertNotSame(429, $status);
        }
    }
}
