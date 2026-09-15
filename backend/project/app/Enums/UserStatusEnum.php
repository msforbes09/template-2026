<?php

namespace App\Enums;

/**
 * Lifecycle status of an end user. Website self-registrations start `draft`
 * (profile freely editable) and become `completed` once the profile is
 * completed (edits are then cooldown-bound).
 */
enum UserStatusEnum: string
{
    case DRAFT = 'draft';
    case COMPLETED = 'completed';
}
