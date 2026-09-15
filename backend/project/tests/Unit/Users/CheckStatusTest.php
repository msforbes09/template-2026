<?php

namespace Tests\Unit\Users;

use App\Enums\UserStatusEnum;
use App\Exceptions\InvalidUserStatusException;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit tests for the reusable status guard.
 */
class CheckStatusTest extends TestCase
{
    use RefreshDatabase;

    /**
     * checkStatus passes for an allowed status (string or array) and throws otherwise.
     */
    public function test_check_status_allows_and_rejects(): void
    {
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'status' => UserStatusEnum::DRAFT->value,
        ]);

        $user->checkStatus('draft');                 // string form — no throw
        $user->checkStatus(['draft', 'completed']);  // array form — no throw

        $this->expectException(InvalidUserStatusException::class);
        $user->checkStatus('completed');
    }
}
