<?php

namespace Tests\Unit\Misc;

use App\Models\Misc\Connections\Connection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the reusable monthly-log query helpers on HasMonthlyTable, exercised
 * through Connection: month-scoped pagination, empty results for an absent table,
 * a filter closure, and single-row lookup.
 */
class HasMonthlyTableQueryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Create a connection log row for the current month.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function makeLog(array $overrides = []): Connection
    {
        return Connection::create(array_merge([
            'type' => 'alpha',
            'method' => 'POST',
            'url' => 'https://alpha.example.test/v1/push',
            'status_code' => '200',
            'user_type' => 'User',
            'user_id' => 1,
            'duration_ms' => 12,
            'requested_at' => now(),
        ], $overrides));
    }

    /**
     * paginateForMonth returns the current month's rows, newest id first.
     */
    public function test_paginate_for_current_month(): void
    {
        $this->makeLog();
        $this->makeLog(['type' => 'beta']);

        $page = Connection::paginateForMonth(null, 20);

        $this->assertSame(2, $page->total());
        $this->assertTrue($page->first()->id > $page->items()[1]->id);
    }

    /**
     * The constrain closure narrows the query (here, by type).
     */
    public function test_paginate_applies_constrain_closure(): void
    {
        $this->makeLog(['type' => 'alpha']);
        $this->makeLog(['type' => 'beta']);

        $page = Connection::paginateForMonth(null, 20, fn ($q) => $q->where('type', 'beta'));

        $this->assertSame(1, $page->total());
        $this->assertSame('beta', $page->first()->type);
    }

    /**
     * A month whose table does not exist yields an empty page (no error).
     */
    public function test_paginate_missing_month_is_empty(): void
    {
        $this->makeLog();

        $page = Connection::paginateForMonth('2020-01', 20);

        $this->assertSame(0, $page->total());
    }

    /**
     * findForMonthOrFail returns the row, or throws for a missing row/table.
     */
    public function test_find_for_month_or_fail(): void
    {
        $log = $this->makeLog();

        $this->assertTrue(Connection::findForMonthOrFail($log->id, null)->is($log));

        $this->expectException(ModelNotFoundException::class);
        Connection::findForMonthOrFail(999999, null);
    }
}
