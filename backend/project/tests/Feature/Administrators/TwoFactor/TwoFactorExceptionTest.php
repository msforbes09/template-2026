<?php

namespace Tests\Feature\Administrators\TwoFactor;

use App\Exceptions\TwoFactorRequiredException;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Tests the 428 two_factor_required envelope.
 */
class TwoFactorExceptionTest extends TestCase
{
    /**
     * It renders 428 with the auth_token and resend_token meta.
     */
    public function test_it_renders_428_with_tokens(): void
    {
        Route::get('/__2fa_required', fn () => throw new TwoFactorRequiredException('AUTH', 'RESEND'));

        $this->getJson('/__2fa_required')
            ->assertStatus(428)
            ->assertJson([
                'error' => 'two_factor_required',
                'meta' => ['auth_token' => 'AUTH', 'resend_token' => 'RESEND'],
            ]);
    }
}
