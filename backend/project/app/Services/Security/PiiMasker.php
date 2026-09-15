<?php

namespace App\Services\Security;

/**
 * Partially redacts contact PII for low-trust surfaces (e.g. paginated list
 * endpoints). Enough of the value survives to recognise a record you already
 * know, but not enough to harvest contact details in bulk. Full values are only
 * ever served by the single-record show endpoints, whose access is audited.
 */
class PiiMasker
{
    /** Characters of a phone number kept at the start (country code + prefix). */
    private const MOBILE_HEAD = 5;

    /** Characters of a phone number kept at the end. */
    private const MOBILE_TAIL = 3;

    /** The phone rule applies only when at least this many characters stay hidden. */
    private const MOBILE_MIN_HIDDEN = 4;

    /**
     * Mask an email LENGTH-PRESERVING, mirroring the phone rule: the local part
     * keeps its head and tail with the middle masked (`kristel@gmail.com` →
     * `k•••••l@gmail.com`) when at least {@see MOBILE_MIN_HIDDEN} characters stay
     * hidden; a 3–4-char local keeps the head only (`alex` → `a•••`); a ≤2-char
     * local is masked entirely. The domain is kept (rarely identifying on its
     * own). Idempotent — a masked value masks to itself.
     */
    public static function maskEmail(?string $email, string $maskChar = '•'): ?string
    {
        if ($email === null || ! str_contains($email, '@')) {
            return $email;
        }

        [$local, $domain] = explode('@', $email, 2);

        // Reveal only the first character, then a FIXED-length mask (never the
        // local-part length, never the trailing character) — a length-preserving
        // head+tail mask on a government roster collapses the candidate set to ~1
        // per named row (F20). The email local part is always ≥1 char, so the head
        // is always a real character, which keeps this idempotent (re-masking
        // `a•••@x` yields `a•••@x`).
        $masked = mb_substr($local, 0, 1).str_repeat($maskChar, 3);

        return $masked.'@'.$domain;
    }

    /**
     * `+639090000123` → `+6390•••••123`: the first five characters (country code +
     * network prefix) and the last three (a recognisable tail) survive, everything
     * between is masked. Applies only when that still hides at least four
     * characters (12+ chars — every E.164 number); anything shorter falls back to
     * the generic {@see mask} policy so a short value is never mostly revealed.
     * ASCII surfaces (DB logs, broadcasts) pass `'*'`.
     */
    public static function maskMobile(?string $mobile, string $maskChar = '•'): ?string
    {
        if ($mobile === null || $mobile === '') {
            return $mobile;
        }

        $length = mb_strlen($mobile);

        if ($length - self::MOBILE_HEAD - self::MOBILE_TAIL < self::MOBILE_MIN_HIDDEN) {
            return self::mask($mobile, $maskChar);
        }

        return mb_substr($mobile, 0, self::MOBILE_HEAD)
            .str_repeat($maskChar, $length - self::MOBILE_HEAD - self::MOBILE_TAIL)
            .mb_substr($mobile, -self::MOBILE_TAIL);
    }

    /**
     * Mask an auth identifier by shape — an email via {@see maskEmail}, anything
     * else as a mobile via {@see maskMobile}. Idempotent: an already-masked value
     * masks to itself, so it is safe to apply at write time AND on read (legacy
     * rows stored raw get masked, new rows stored masked pass through unchanged).
     */
    public static function maskIdentifier(?string $identifier, string $maskChar = '•'): ?string
    {
        if ($identifier === null || $identifier === '') {
            return $identifier;
        }

        return str_contains($identifier, '@')
            ? self::maskEmail($identifier)
            : self::maskMobile($identifier, $maskChar);
    }

    /**
     * Generic partial mask (same policy as {@see maskMobile}): reveal a short head
     * plus the last two characters, mask at least half. Used to redact PII-ish
     * fields in low-trust logs while keeping a value recognisable. `$maskChar`
     * defaults to the bullet used in API responses; ASCII surfaces (e.g. DB logs)
     * pass `'*'` to avoid unicode escaping.
     */
    public static function mask(?string $value, string $maskChar = '•'): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        $length = mb_strlen($value);

        if ($length <= 5) {
            return str_repeat($maskChar, 5);
        }

        // Reveal at most half the characters (floor), split into a short head and
        // the last two; the rest is masked. `hidden = ceil(length / 2) >= revealed`.
        $reveal = intdiv($length, 2);
        $tail = min(2, $reveal);
        $head = $reveal - $tail;

        return mb_substr($value, 0, $head).str_repeat($maskChar, $length - $head - $tail).mb_substr($value, -$tail);
    }

    /**
     * Mask any standalone 4–8 digit run in free text (an OTP / PIN) to same-length
     * mask characters, leaving the surrounding words intact — so "Your OTP is
     * 483920" logs as "Your OTP is ******". For message/notification bodies where a
     * one-time code may be embedded in prose that we still want readable.
     */
    public static function maskDigitRuns(?string $text, string $maskChar = '*'): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }

        return (string) preg_replace_callback(
            '/(?<!\d)\d{4,8}(?!\d)/',
            fn (array $m) => str_repeat($maskChar, strlen($m[0])),
            $text,
        );
    }
}
