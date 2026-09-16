<?php

namespace Database\Seeders;

use App\Enums\FileEnum;
use App\Enums\PermissionEnum;
use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;

/**
 * Seeds the permission catalog, the Super Admin role, and the super administrator.
 */
class AccessSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->seedPermissions();
        $role = $this->seedSuperAdminRole();
        $this->seedSuperAdministrator($role);
    }

    /**
     * Create the permission groups and their permissions from the catalog.
     */
    protected function seedPermissions(): void
    {
        foreach (PermissionEnum::PERMISSIONS as $group => $permissions) {
            $permissionGroup = PermissionGroup::firstOrCreate(['name' => $group]);

            foreach ($permissions as $permission) {
                Permission::firstOrCreate(
                    ['name' => $permission, 'guard_name' => Administrator::AUTH_GUARD],
                    ['group_id' => $permissionGroup->id],
                );
            }
        }
    }

    /**
     * Create (or fetch) the Super Admin role holding every permission.
     */
    protected function seedSuperAdminRole(): Role
    {
        $role = Role::firstOrCreate([
            'name' => 'Super Admin',
            'guard_name' => Administrator::AUTH_GUARD,
        ]);

        $role->syncPermissions(Permission::all());

        return $role;
    }

    /**
     * Create (or fetch) the super administrator and assign the Super Admin role.
     * Skipped (with a warning) when SUPER_ADMIN_EMAIL/PASSWORD are not set, so a
     * permission-catalog reseed never depends on those envs.
     */
    protected function seedSuperAdministrator(Role $role): void
    {
        $email = config('auth.super_admin.email');
        $password = config('auth.super_admin.password');

        if (blank($email) || blank($password)) {
            $this->command?->warn('SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set — permissions and the Super Admin role were seeded, the super administrator account was skipped.');

            return;
        }

        $administrator = Administrator::firstOrCreate(
            ['email' => $email],
            [
                'password' => $password,
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'photo_uuid' => null,
                'is_active' => 1,
                'is_developer' => 1,
                'with_temporary_password' => 0,
            ],
        );

        if (! $administrator->hasRole($role)) {
            $administrator->assignRole($role);
        }

        $this->attachSuperAdministratorPhoto($administrator);
    }

    /**
     * Upload the bundled default photo as a private file for the super admin.
     */
    protected function attachSuperAdministratorPhoto(Administrator $administrator): void
    {
        $path = storage_path('images/default.jpg');

        if ($administrator->photo_uuid || ! file_exists($path)) {
            return;
        }

        $file = $administrator->uploadFile(
            new UploadedFile($path, 'default.png', 'image/png', null, test: true),
            FileEnum::VISIBILITY['PRIVATE'],
        );

        if ($file->status === FileEnum::STATUS['UPLOADED']) {
            $administrator->update(['photo_uuid' => $file->uuid]);
        }
    }
}
