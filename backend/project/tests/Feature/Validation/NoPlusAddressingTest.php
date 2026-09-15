<?php

namespace Tests\Feature\Validation;

use App\Rules\NoPlusAddressing;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Tests the plus-addressing (sub-addressing) email rule.
 */
class NoPlusAddressingTest extends TestCase
{
    /**
     * Assert whether a value passes the rule.
     */
    private function passes(mixed $value): bool
    {
        return Validator::make(['email' => $value], ['email' => [new NoPlusAddressing]])->passes();
    }

    /**
     * A plus-addressed local part is rejected.
     */
    public function test_rejects_plus_addressed_email(): void
    {
        $this->assertFalse($this->passes('admin+001@example.com'));
    }

    /**
     * A normal email passes.
     */
    public function test_allows_plain_email(): void
    {
        $this->assertTrue($this->passes('admin@example.com'));
    }

    /**
     * A `+` in the domain (not the local part) does not trip the rule.
     */
    public function test_ignores_plus_in_domain(): void
    {
        $this->assertTrue($this->passes('admin@ex+ample.com'));
    }
}
