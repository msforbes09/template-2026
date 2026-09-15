<?php

namespace App\Models\Concerns;

use App\Models\Misc\Files\File;
use Illuminate\Http\UploadedFile;

/**
 * Lets a model upload and own files.
 */
trait UploadsFiles
{
    /**
     * Upload a file owned by this model (owner bound during create).
     */
    public function uploadFile(UploadedFile $file, string $visibility): File
    {
        return (new File)->uploadFromFile($file, $visibility, $this);
    }
}
