<?php

namespace Tests\Feature\Auditing;

use App\Models\Concerns\HasMonthlyTable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Tests the monthly-table trait's name resolution and lazy creation.
 */
class HasMonthlyTableTest extends TestCase
{
    /**
     * Build an anonymous model that uses the trait against the default connection.
     */
    private function monthlyModel(): Model
    {
        return new class extends Model
        {
            use HasMonthlyTable;

            protected string $baseTable = 'widgets';

            protected function createMonthlyTable(string $tableName): void
            {
                Schema::connection($this->getConnectionName())->create($tableName, fn ($t) => $t->id());
            }
        };
    }

    /**
     * getTable() resolves to the current month, base-first.
     */
    public function test_get_table_is_base_first_current_month(): void
    {
        $model = $this->monthlyModel();

        $this->assertSame('widgets_'.now()->format('Y_m'), $model->getTable());
        $this->assertSame('widgets_2026_06', $model->getTableForMonth('2026-06-15'));
    }

    /**
     * createMonthlyTableIfNotExists() creates a missing table and is idempotent.
     */
    public function test_create_monthly_table_if_not_exists(): void
    {
        $model = $this->monthlyModel();

        $this->assertTrue($model->createMonthlyTableIfNotExists('2026-06-15'));
        $this->assertTrue(Schema::hasTable('widgets_2026_06'));
        $this->assertFalse($model->createMonthlyTableIfNotExists('2026-06-15'));
    }
}
