<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * The service-status endpoint at `/`.
 *
 * It is used to confirm a domain points at the right service and that a deploy shipped
 * the intended version — so it cannot simply be stripped. Instead the identifying
 * fields stay public (that is the domain check) and the operational ones are revealed
 * only to a caller holding the status token.
 */
class StatusEndpointTest extends TestCase
{
    /**
     * Anyone may confirm which service answers this domain — that is the whole point
     * of the endpoint, and it gives an attacker nothing.
     */
    public function test_the_public_payload_identifies_the_service(): void
    {
        config([
            'app.name' => 'NBI Integration',
            'app.service_name' => 'WS',
            'app.timezone' => 'Asia/Manila',
        ]);

        $response = $this->getJson('/')->assertOk();

        $response->assertJson([
            'name' => 'NBI Integration',
            'service_name' => 'WS',
            'timezone' => 'Asia/Manila',
        ]);

        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/',
            $response->json('server_time'),
        );
    }

    /**
     * ...but learns nothing about the deployment.
     */
    public function test_the_public_payload_hides_environment_and_version(): void
    {
        $this->getJson('/')
            ->assertOk()
            ->assertJsonMissingPath('environment')
            ->assertJsonMissingPath('version');
    }

    /**
     * A caller holding the status token sees the deployment detail — this is the
     * deploy check: confirm the intended version actually shipped.
     */
    public function test_a_valid_status_token_reveals_environment_and_version(): void
    {
        config(['app.status_token' => 'deploy-check-token', 'app.version' => 'v1.2.3']);

        $this->withHeader('X-Status-Token', 'deploy-check-token')
            ->getJson('/')
            ->assertOk()
            ->assertJsonPath('version', 'v1.2.3')
            ->assertJsonPath('environment', config('app.env'));
    }

    /**
     * A wrong token reveals nothing — and is not distinguishable from no token.
     */
    public function test_a_wrong_status_token_reveals_nothing(): void
    {
        config(['app.status_token' => 'deploy-check-token']);

        $this->withHeader('X-Status-Token', 'guessing')
            ->getJson('/')
            ->assertOk()
            ->assertJsonMissingPath('environment')
            ->assertJsonMissingPath('version');
    }

    /**
     * With no token configured the detail is never exposed, whatever is presented —
     * an unset secret must fail closed, not open.
     */
    public function test_an_unconfigured_token_fails_closed(): void
    {
        config(['app.status_token' => null]);

        $this->withHeader('X-Status-Token', '')
            ->getJson('/')
            ->assertOk()
            ->assertJsonMissingPath('environment')
            ->assertJsonMissingPath('version');
    }

    /**
     * The framework's health endpoint is disabled — it was unused, and an unauthenticated
     * probe surface with nothing depending on it is a surface worth not having.
     */
    public function test_the_up_health_endpoint_is_gone(): void
    {
        $this->get('/up')->assertNotFound();
    }
}
