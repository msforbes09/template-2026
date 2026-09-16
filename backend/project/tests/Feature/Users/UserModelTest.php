<?php

namespace Tests\Feature\Users;

use App\Models\Users\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the User model basics (uuid, display_name, email munge, casts).
 */
class UserModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A sortable uuid is generated; routes still bind by the internal id.
     */
    public function test_generates_uuid_and_binds_routes_by_id(): void
    {
        $user = User::factory()->create();

        $this->assertNotEmpty($user->uuid);
        $this->assertSame($user->id, $user->getRouteKey());
    }

    /**
     * display_name is "First Last Suffix" (middle name omitted).
     */
    public function test_display_name(): void
    {
        $user = User::factory()->make([
            'first_name' => 'Alex', 'middle_name' => 'Lee', 'last_name' => 'Rivera', 'suffix_name' => 'Jr.',
        ]);

        $this->assertSame('Alex Rivera Jr.', $user->display_name);
    }

    /**
     * Casts, hidden password, and the photo relation.
     */
    public function test_casts_hidden_and_photo_relation(): void
    {
        $user = User::factory()->create(['birth_date' => '1990-01-01', 'password' => 'secret']);

        // birth_date is now an encrypted-blob string (not a date-cast column).
        $this->assertSame('1990-01-01', $user->birth_date);
        $this->assertInstanceOf(BelongsTo::class, $user->photo());
        $this->assertArrayNotHasKey('password', $user->toArray());
    }
}
