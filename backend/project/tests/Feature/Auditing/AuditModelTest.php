<?php

namespace Tests\Feature\Auditing;

use App\Models\Misc\Audits\Audit;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Tests the Audit model's table naming and self-creating schema.
 */
class AuditModelTest extends TestCase
{
    /**
     * The table is audits_YYYY_MM and self-creates with the expected columns.
     */
    public function test_audit_table_name_and_schema(): void
    {
        $audit = new Audit;

        $this->assertSame('audits_'.now()->format('Y_m'), $audit->getTable());

        $audit->createMonthlyTableIfNotExists();

        $table = $audit->getTable();
        $this->assertTrue(Schema::hasTable($table));
        foreach (['id', 'user_type', 'user_id', 'event', 'auditable_type', 'auditable_id', 'old_values', 'new_values', 'url', 'ip_address', 'user_agent', 'tags', 'created_at', 'updated_at'] as $column) {
            $this->assertTrue(Schema::hasColumn($table, $column), "missing {$column}");
        }
    }
}
