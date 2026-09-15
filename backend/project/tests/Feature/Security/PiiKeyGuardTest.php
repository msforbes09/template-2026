<?php

namespace Tests\Feature\Security;

use App\Services\Security\PiiKeyGuard;
use RuntimeException;
use Tests\TestCase;

/**
 * PII key isolation is enforced in production: an unset key fails closed.
 */
class PiiKeyGuardTest extends TestCase
{
    /**
     * Production without an explicit PII key throws at boot.
     */
    public function test_production_without_key_throws(): void
    {
        $this->expectException(RuntimeException::class);
        PiiKeyGuard::assert(isProduction: true, piiKey: null);
    }

    /**
     * A blank key in production is treated as unset.
     */
    public function test_production_with_blank_key_throws(): void
    {
        $this->expectException(RuntimeException::class);
        PiiKeyGuard::assert(true, '   ');
    }

    /**
     * Production with an explicit key is allowed.
     */
    public function test_production_with_key_is_allowed(): void
    {
        PiiKeyGuard::assert(true, 'base64:a-dedicated-pii-key');
        $this->expectNotToPerformAssertions();
    }

    /**
     * Non-production may rely on the APP_KEY fallback (dev convenience).
     */
    public function test_non_production_without_key_is_allowed(): void
    {
        PiiKeyGuard::assert(false, null);
        $this->expectNotToPerformAssertions();
    }

    /**
     * The boot guard must read the dedicated key from config — which is baked in by
     * `config:cache` — not env(), which returns null once config is cached in
     * production. The config value maps to PII_ENCRYPTION_KEY with NO APP_KEY
     * fallback, so a missing dedicated key is still detectable.
     */
    public function test_dedicated_key_is_exposed_via_config_without_fallback(): void
    {
        $this->assertTrue(app('config')->has('app.pii_key_explicit'));
        $this->assertSame(env('PII_ENCRYPTION_KEY'), config('app.pii_key_explicit'));
    }
}
