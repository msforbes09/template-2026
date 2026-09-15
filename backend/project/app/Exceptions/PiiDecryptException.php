<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a model's encrypted PII blob cannot be decrypted (wrong/rotated
 * key or corrupt ciphertext) and a WRITE is attempted against it. Reads degrade
 * to null, but a write must fail closed — rebuilding the blob from an empty base
 * would erase every other encrypted field irrecoverably. Surfacing as a 500 is
 * intentional: a mis-keyed environment is an operational emergency, not a
 * silently-absorbed condition.
 */
class PiiDecryptException extends RuntimeException {}
