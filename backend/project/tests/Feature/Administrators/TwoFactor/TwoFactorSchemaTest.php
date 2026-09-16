<?php

namespace Tests\Feature\Administrators\TwoFactor;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Confirms the administrators table has the 2FA trust column.
 */
class TwoFactorSchemaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The trusted_device column exists.
     */
    public function test_administrators_has_trusted_device_column(): void
    {
        $this->assertTrue(Schema::hasColumn('administrators', 'trusted_device'));
    }
}
