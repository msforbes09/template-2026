<?php

namespace App\Enums;

/**
 * File upload catalog: visibility, lifecycle status, accepted MIME types, the
 * size cap, and the content-threat blacklist — shared by the File model and
 * the upload FormRequest.
 */
class FileEnum
{
    /**
     * Visibility modes.
     *
     * @var array<string, string>
     */
    public const VISIBILITY = ['PUBLIC' => 'public', 'PRIVATE' => 'private'];

    /**
     * Upload lifecycle states.
     *
     * @var array<string, string>
     */
    public const STATUS = ['DRAFT' => 'draft', 'UPLOADED' => 'uploaded', 'FAILED' => 'failed'];

    /**
     * Maximum upload size in kilobytes (10 MB).
     */
    public const MAX_SIZE_KB = 10240;

    /**
     * Accepted MIME types by category. Only `images` is currently exposed.
     *
     * @var array<string, list<string>>
     */
    public const MIME_TYPES = [
        'images' => ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
        'documents' => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'videos' => ['video/mp4', 'video/quicktime'],
    ];

    /**
     * Byte-signature blacklist scanned in uploaded file contents. A shallow,
     * bypassable heuristic — defense-in-depth only. The real protections are
     * the real-MIME check, images-only, UUID object names, and serving from
     * R2 (which never executes code).
     *
     * @var list<string>
     */
    public const THREATS = [
        // PHP / template tags. The 2–3 byte tags `<%` and `<?=` are deliberately
        // omitted: this scan runs over raw file BYTES, and such short sequences
        // occur by chance in ordinary binary images (`<%` in ~50% of a 50KB photo),
        // so including them false-rejects most legitimate uploads. The remaining
        // signatures are all ≥5 bytes, where the collision rate is negligible — and
        // the real defence against a served polyglot is the MIME-derived object name
        // + non-executing R2 storage, not this heuristic.
        '<?php',
        // HTML / script injection (belt-and-suspenders for images; matters if SVG/HTML/docs are ever accepted)
        '<script', '</script>', '<html', '<iframe', '<object', '<embed', 'onerror=', 'onload=',
        // Dangerous PHP functions
        'eval(', 'assert(', 'base64_decode(', 'shell_exec(', 'exec(', 'passthru(', 'proc_open', 'system(',
        // Shell execution
        '/bin/bash', '/bin/sh', 'cmd.exe', 'powershell',
    ];
}
