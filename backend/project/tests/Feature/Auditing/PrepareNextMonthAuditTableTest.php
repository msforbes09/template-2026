<?php

namespace Tests\Feature\Auditing;

use App\Models\Misc\Audits\Audit;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Tests the command that pre-creates next month's audit table.
 */
class PrepareNextMonthAuditTableTest extends TestCase
{
    /**
     * The command creates next month's audit table.
     */
    public function test_it_creates_next_month_table(): void
    {
        $expected = (new Audit)->getTableForMonth(now()->addMonth());

        $this->assertFalse(Schema::hasTable($expected));

        $this->artisan('audit:prepare-next-table')->assertExitCode(0);

        $this->assertTrue(Schema::hasTable($expected));
    }
}
