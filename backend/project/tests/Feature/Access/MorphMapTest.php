<?php

namespace Tests\Feature\Access;

use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Tests\TestCase;

/**
 * Ensures every model is registered in the morph map by its short name.
 */
class MorphMapTest extends TestCase
{
    /**
     * The access models (and administrator) resolve to short morph aliases.
     */
    public function test_models_use_short_morph_aliases(): void
    {
        $this->assertSame('Administrator', (new Administrator)->getMorphClass());
        $this->assertSame('Role', (new Role)->getMorphClass());
        $this->assertSame('Permission', (new Permission)->getMorphClass());
        $this->assertSame('PermissionGroup', (new PermissionGroup)->getMorphClass());
    }
}
