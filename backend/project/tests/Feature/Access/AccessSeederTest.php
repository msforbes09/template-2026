<?php

namespace Tests\Feature\Access;

use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use Database\Seeders\AccessSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Feature tests for the access-control seeder.
 */
class AccessSeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Provide super-admin credentials the seeder requires.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config([
            'auth.super_admin.email' => 'super@admin.test',
            'auth.super_admin.password' => 'password123',
        ]);
    }

    /**
     * Without SUPER_ADMIN_EMAIL/PASSWORD the seeder still runs — permissions and
     * the Super Admin role are (re)seeded, only the account creation is skipped —
     * so an environment can reseed new permission groups without those envs.
     */
    public function test_runs_without_super_admin_credentials(): void
    {
        config(['auth.super_admin.email' => null, 'auth.super_admin.password' => null]);

        $this->seed(AccessSeeder::class);

        $this->assertGreaterThan(0, Permission::count());
        $this->assertNotNull(Role::where('name', 'Super Admin')->first());
        $this->assertSame(0, Administrator::count());
    }

    /**
     * The super administrator is seeded with an uploaded private photo file.
     */
    public function test_it_uploads_the_super_admin_photo(): void
    {
        $this->seed(AccessSeeder::class);

        $admin = Administrator::firstWhere('email', 'super@admin.test');
        $this->assertNotNull($admin->photo_uuid);
        $this->assertNotNull($admin->photo);
        $this->assertSame('Administrator', $admin->photo->owner_type);
        Storage::disk(File::PRIVATE_DISK)->assertExists("{$admin->photo->folder_path}/{$admin->photo->uploaded_name}");
    }

    /**
     * The catalog (groups + permissions) is seeded.
     */
    public function test_it_seeds_the_permission_catalog(): void
    {
        $this->seed(AccessSeeder::class);

        $this->assertSame(8, PermissionGroup::count());
        $this->assertSame(16, Permission::count());
    }

    /**
     * The Super Admin role holds every permission and is assigned to the super admin.
     */
    public function test_super_admin_role_holds_all_permissions_and_is_assigned(): void
    {
        $this->seed(AccessSeeder::class);

        $role = Role::where('name', 'Super Admin')->firstOrFail();
        $this->assertSame(16, $role->permissions()->count());

        $admin = Administrator::where('email', 'super@admin.test')->firstOrFail();
        $this->assertTrue($admin->hasRole('Super Admin'));
    }

    /**
     * Re-running the seeder creates no duplicates.
     */
    public function test_it_is_idempotent(): void
    {
        $this->seed(AccessSeeder::class);
        $this->seed(AccessSeeder::class);

        $this->assertSame(16, Permission::count());
        $this->assertSame(1, Role::where('name', 'Super Admin')->count());
        $this->assertSame(1, Administrator::where('email', 'super@admin.test')->count());
    }
}
