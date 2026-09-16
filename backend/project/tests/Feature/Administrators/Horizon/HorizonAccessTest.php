<?php

namespace Tests\Feature\Administrators\Horizon;

use App\Models\Administrators\Administrator;
use App\Providers\HorizonServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The signed handoff from the admin console into the Horizon dashboard: only
 * developer administrators can mint a link, the link is bound to the dashboard
 * origin, and the dashboard itself opens only for a session that followed one
 * (or in the local environment).
 */
class HorizonAccessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an admin with the given abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingWith(array $abilities): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            $abilities,
            'administrators',
        );
    }

    /**
     * Minting a link needs the developer-access ability.
     */
    public function test_minting_a_link_requires_developer_access(): void
    {
        $this->actingWith(['administrators-view', 'roles-manage']);

        $this->postJson('/api/v1/administrator/horizon/access')->assertForbidden();
    }

    /**
     * The link lives on the dashboard origin, carries a relative signature, and
     * expires in a minute.
     */
    public function test_minting_a_link_returns_a_signed_url_on_the_dashboard_origin(): void
    {
        config(['horizon.dashboard_url' => 'https://horizon.example.test/']);
        $this->actingWith(['developer-access']);

        $response = $this->postJson('/api/v1/administrator/horizon/access')->assertOk();

        $url = $response->json('data.url');
        $this->assertStringStartsWith('https://horizon.example.test/horizon-access?', $url);
        $this->assertStringContainsString('expires=', $url);
        $this->assertStringContainsString('signature=', $url);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $response->json('data.expires_at'));

        // The signature validates relative to the path, so it holds on the
        // dashboard host even though it was minted on the API host.
        $relative = substr($url, strlen('https://horizon.example.test'));
        $this->get($relative)->assertRedirect('/horizon');
    }

    /**
     * Following a signed link marks the session and lands on the dashboard.
     */
    public function test_following_a_signed_link_authorises_the_session(): void
    {
        $link = URL::temporarySignedRoute('horizon.access', now()->addMinute(), [], false);

        $this->get($link)
            ->assertRedirect('/horizon')
            ->assertSessionHas(HorizonServiceProvider::SESSION_KEY);
    }

    /**
     * An unsigned or tampered link is refused.
     */
    public function test_an_unsigned_link_is_forbidden(): void
    {
        $this->get('/horizon-access')->assertForbidden();
        $this->get('/horizon-access?expires=1&signature=nope')->assertForbidden();
    }

    /**
     * Outside local, the dashboard opens only for an authorised session.
     */
    public function test_dashboard_requires_an_authorised_session_outside_local(): void
    {
        $this->get('/horizon')->assertForbidden();

        $this->withSession([HorizonServiceProvider::SESSION_KEY => now()->format('Y-m-d H:i:s')])
            ->get('/horizon')
            ->assertOk();
    }

    /**
     * The local environment opens the dashboard without a handoff.
     */
    public function test_dashboard_is_open_in_local(): void
    {
        $this->app['env'] = 'local';

        $this->get('/horizon')->assertOk();
    }
}
