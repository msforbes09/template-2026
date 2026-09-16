<?php

namespace App\Enums;

/**
 * The broadcast lifecycle: composed as a draft, explicitly started (fan-out
 * queued), and finally sent once every recipient's row is written.
 */
enum BroadcastStatusEnum: string
{
    case DRAFT = 'draft';
    case SENDING = 'sending';
    case SENT = 'sent';
}
