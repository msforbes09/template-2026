<?php

namespace App\Enums;

/**
 * The administrator permission catalog: named permissions grouped for seeding
 * and referenced by route middleware and OpenAPI docs.
 */
class PermissionEnum
{
    public const ADMINISTRATORS_VIEW = 'administrators-view';

    public const ADMINISTRATORS_MANAGE = 'administrators-manage';

    public const ROLES_VIEW = 'roles-view';

    public const ROLES_MANAGE = 'roles-manage';

    public const CONTENTS_VIEW = 'contents-view';

    public const CONTENTS_MANAGE = 'contents-manage';

    public const DOCUMENTATIONS_VIEW = 'documentations-view';

    public const DOCUMENTATIONS_MANAGE = 'documentations-manage';

    public const USERS_VIEW = 'users-view';

    public const USERS_MANAGE = 'users-manage';

    public const GALLERY_VIEW = 'gallery-view';

    public const GALLERY_MANAGE = 'gallery-manage';

    public const CONNECTION_LOGS_VIEW = 'connection-logs-view';

    public const AUTH_LOGS_VIEW = 'auth-logs-view';

    public const AUDIT_LOGS_VIEW = 'audit-logs-view';

    public const NOTIFICATIONS_BROADCAST = 'notifications-broadcast';

    /**
     * VIRTUAL ability — deliberately absent from PERMISSIONS so it is never
     * seeded, can never be attached to a role, and can never be granted over
     * HTTP (`is_developer` itself is not settable over the API — seeder/DB
     * only). It exists only as a token ability appended at login for
     * `is_developer` administrators (see Administrator::tokenAbilities()),
     * and gates the developer-only surfaces — currently the entire
     * feature-flags management API.
     */
    public const DEVELOPER_ACCESS = 'developer-access';

    /**
     * Permission group name => the permission names it contains.
     *
     * @var array<string, list<string>>
     */
    public const PERMISSIONS = [
        'administrators' => [self::ADMINISTRATORS_VIEW, self::ADMINISTRATORS_MANAGE],
        'roles' => [self::ROLES_VIEW, self::ROLES_MANAGE],
        'contents' => [self::CONTENTS_VIEW, self::CONTENTS_MANAGE],
        'documentations' => [self::DOCUMENTATIONS_VIEW, self::DOCUMENTATIONS_MANAGE],
        'users' => [self::USERS_VIEW, self::USERS_MANAGE],
        'gallery' => [self::GALLERY_VIEW, self::GALLERY_MANAGE],
        'logs' => [self::CONNECTION_LOGS_VIEW, self::AUTH_LOGS_VIEW, self::AUDIT_LOGS_VIEW],
        'notifications' => [self::NOTIFICATIONS_BROADCAST],
    ];
}
