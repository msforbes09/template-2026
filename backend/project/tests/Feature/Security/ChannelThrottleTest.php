<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * F11 — the channel-aware auth limiters key on the resolved channel identifier
 * (email, else mobile), not on `email` alone. So two different SMS-channel callers
 * get separate buckets instead of all sharing the empty-email bucket (which would
 * let one caller lock out every SMS login on the platform).
 */
class ChannelThrottleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Exhaust one SMS-channel mobile's bucket, then confirm a DIFFERENT mobile is
     * still served — proving the buckets are per-identifier, not shared.
     */
    public function test_sms_channel_callers_do_not_share_one_bucket(): void
    {
        $hammer = fn (string $mobile) => $this->postJson('/api/v1/user/authenticate', [
            'channel' => 'sms', 'mobile_number' => $mobile, 'password' => 'whatever',
        ])->getStatusCode();

        // 5/min limit — the 6th for mobile A trips the limiter.
        $statusesA = [];
        for ($i = 0; $i < 6; $i++) {
            $statusesA[] = $hammer('+639170000001');
        }
        $this->assertSame(429, end($statusesA), 'mobile A should be throttled after its own 5/min');

        // A different mobile has its own bucket — not thrown by A's flood.
        $this->assertNotSame(429, $hammer('+639170000002'), 'mobile B must not share mobile A\'s bucket');
    }
}
