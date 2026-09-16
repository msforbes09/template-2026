<?php

namespace Tests\Feature\Security;

use App\Models\Administrators\Administrator;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The app sits behind Cloudflare → AWS load balancer → Docker NAT → nginx → FPM, so
 * REMOTE_ADDR as PHP sees it is an internal hop, never the caller. Every log type
 * (gateway, connection, audit, auth-attempt) and every IP-keyed rate limiter reads
 * `$request->ip()`, so that hop chain has to be trusted and walked back through
 * X-Forwarded-For — otherwise every row in production shows the Docker gateway.
 */
class TrustedProxiesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Seed one admin so an authenticate call records an attempt row.
     */
    private function seedAdmin(): void
    {
        Administrator::factory()->create([
            'email' => 'ada@admin.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'with_temporary_password' => false,
        ]);
    }

    /**
     * The most recent attempt row.
     */
    private function lastAttempt(): ?AuthAttempt
    {
        return AuthAttempt::query()->orderByDesc('id')->first();
    }

    /**
     * A request relayed through the production hop chain (Docker NAT as the peer,
     * LB + Cloudflare in X-Forwarded-For) is attributed to the original client.
     */
    public function test_client_ip_is_resolved_through_the_trusted_proxy_chain(): void
    {
        $this->seedAdmin();

        $this
            ->withServerVariables(['REMOTE_ADDR' => '172.20.0.1'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.45, 172.70.142.90, 10.0.0.5'])
            ->postJson('/api/v1/administrator/authenticate', [
                'email' => 'ada@admin.test',
                'password' => 'wrong-password',
            ]);

        $this->assertSame('203.0.113.45', $this->lastAttempt()?->ip_address);
    }

    /**
     * The Docker bridge subnet is whatever the host daemon's address pool hands
     * out (staging's is 172.80.x, outside RFC1918's 172.16/12), so the immediate
     * peer must be trusted whatever it is — PHP never sees a public peer through
     * the NAT, only the bridge.
     */
    public function test_client_ip_is_resolved_whatever_the_docker_bridge_subnet_is(): void
    {
        $this->seedAdmin();

        $this
            ->withServerVariables(['REMOTE_ADDR' => '172.80.0.1'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.45, 172.70.142.90, 10.0.0.5'])
            ->postJson('/api/v1/administrator/authenticate', [
                'email' => 'ada@admin.test',
                'password' => 'wrong-password',
            ]);

        $this->assertSame('203.0.113.45', $this->lastAttempt()?->ip_address);
    }

    /**
     * The Next.js UI server calls the API on the browser's behalf (server actions),
     * forwarding the human's IP in X-Forwarded-For. Its egress address differs per
     * environment, so it's appended through config (TRUSTED_PROXIES env) rather than
     * the baked-in list — and once trusted, the walk reaches the human.
     */
    public function test_an_environment_configured_extra_proxy_is_trusted(): void
    {
        $this->seedAdmin();
        config(['trustedproxy.proxies' => [...config('trustedproxy.proxies'), '198.51.100.7']]);

        $this
            ->withServerVariables(['REMOTE_ADDR' => '172.80.0.1'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.9, 198.51.100.7, 172.70.142.90, 10.0.0.5'])
            ->postJson('/api/v1/administrator/authenticate', [
                'email' => 'ada@admin.test',
                'password' => 'wrong-password',
            ]);

        $this->assertSame('203.0.113.9', $this->lastAttempt()?->ip_address);
    }

    /**
     * Without that extra hop trusted, the walk stops at the UI server — which is the
     * correct, conservative answer, not a silent pass-through.
     */
    public function test_an_unconfigured_ui_server_hop_is_where_the_walk_stops(): void
    {
        $this->seedAdmin();

        $this
            ->withServerVariables(['REMOTE_ADDR' => '172.80.0.1'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.9, 198.51.100.7, 172.70.142.90, 10.0.0.5'])
            ->postJson('/api/v1/administrator/authenticate', [
                'email' => 'ada@admin.test',
                'password' => 'wrong-password',
            ]);

        $this->assertSame('198.51.100.7', $this->lastAttempt()?->ip_address);
    }

    /**
     * The walk back through X-Forwarded-For stops at the first hop that isn't a
     * trusted proxy — a forged prefix in front of an untrusted relay is not
     * honoured; that relay is what gets recorded.
     */
    public function test_forwarded_for_walk_stops_at_the_first_untrusted_hop(): void
    {
        $this->seedAdmin();

        $this
            ->withServerVariables(['REMOTE_ADDR' => '172.20.0.1'])
            ->withHeaders(['X-Forwarded-For' => '192.0.2.4, 203.0.113.9'])
            ->postJson('/api/v1/administrator/authenticate', [
                'email' => 'ada@admin.test',
                'password' => 'wrong-password',
            ]);

        $this->assertSame('203.0.113.9', $this->lastAttempt()?->ip_address);
    }
}
