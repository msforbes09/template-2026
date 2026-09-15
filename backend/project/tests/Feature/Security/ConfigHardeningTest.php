<?php

namespace Tests\Feature\Security;

use App\Models\Administrators\Administrator;
use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Secure-by-default configuration: debug output, the docs UI, and the upload surface.
 */
class ConfigHardeningTest extends TestCase
{
    use RefreshDatabase;

    /**
     * FINDING 12 — debug mode must never be on in production, whatever the `.env` says.
     *
     * A `.env` copied from the template and never edited would have shipped
     * `APP_DEBUG=true`, and a debug error page prints configuration and stack traces —
     * credentials included. Forced off at boot rather than merely warned about: a log
     * line nobody reads is not a control, and aborting the boot would trade a leak for
     * an outage.
     */
    public function test_debug_is_forced_off_in_production(): void
    {
        config(['app.debug' => true]);
        $this->app->detectEnvironment(fn () => 'production');

        (new AppServiceProvider($this->app))->boot();

        $this->assertFalse(config('app.debug'), 'Debug must be forced off in production.');
    }

    /**
     * Outside production, debug is left alone — that is where it earns its keep.
     */
    public function test_debug_is_left_alone_outside_production(): void
    {
        config(['app.debug' => true]);
        $this->app->detectEnvironment(fn () => 'local');

        (new AppServiceProvider($this->app))->boot();

        $this->assertTrue(config('app.debug'));
    }

    /**
     * FINDING 17 — the docs UI must not be reachable in production.
     *
     * Swagger cannot be put behind `auth:administrators` as the scanner suggests: it is
     * a browser page, and a browser cannot present a Sanctum bearer token — that would
     * lock everyone out, not secure it. So it is switched off instead.
     */
    public function test_the_docs_ui_is_unreachable_when_disabled(): void
    {
        config(['app.docs_enabled' => false]);

        $this->get('/api/documentation')->assertNotFound();
    }

    /**
     * ...and still available where it is wanted.
     */
    public function test_the_docs_ui_is_reachable_when_enabled(): void
    {
        config(['app.docs_enabled' => true]);

        $this->get('/api/documentation')->assertOk();
    }

    /**
     * FINDING 20 — an admin who has not finished setting up their account cannot upload
     * files. Every other management surface already refuses them; this one did not.
     */
    public function test_a_temporary_password_admin_cannot_upload(): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => true]),
            ['*'],
            'administrators',
        );

        $this->postJson('/api/v1/common/files/private')
            ->assertStatus(403)
            ->assertJson(['error' => 'temporary_password']);
    }

    /**
     * A fully set-up admin still reaches the endpoint — refused by validation (no file
     * attached), not by the guard.
     */
    public function test_a_normal_admin_still_reaches_the_upload_endpoint(): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            ['*'],
            'administrators',
        );

        $this->postJson('/api/v1/common/files/private')->assertStatus(422);
    }
}
