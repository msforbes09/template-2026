<?php

namespace Tests\Unit\Services\Security;

use App\Services\Security\PiiMasker;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the contact-PII masker.
 */
class PiiMaskerTest extends TestCase
{
    /**
     * @return array<string, array{0: ?string, 1: ?string}>
     */
    public static function emails(): array
    {
        return [
            // First char only + a FIXED-length mask — never the local-part length,
            // never the trailing character (F20); the domain is kept.
            'long local' => ['kristel@gmail.com', 'k•••@gmail.com'],
            'five char local' => ['morgan@mail.example.com', 'm•••@mail.example.com'],
            'ordinary' => ['user@example.com', 'u•••@example.com'],
            'three char local' => ['ada@admin.test', 'a•••@admin.test'],
            'two char local' => ['jo@example.com', 'j•••@example.com'],
            'single char local' => ['a@example.com', 'a•••@example.com'],
            // Idempotent — re-masking an already-masked address is a no-op-shape.
            'already masked' => ['a•••@example.com', 'a•••@example.com'],
            'null passes through' => [null, null],
            'non-email passes through' => ['not-an-email', 'not-an-email'],
        ];
    }

    /**
     * The local part shows only its first character then a fixed-length mask (no
     * length, no tail); the domain is kept.
     */
    #[DataProvider('emails')]
    public function test_mask_email(?string $input, ?string $expected): void
    {
        $this->assertSame($expected, PiiMasker::maskEmail($input));
    }

    /**
     * @return array<string, array{0: ?string, 1: ?string}>
     */
    public static function mobiles(): array
    {
        return [
            // 13 chars (E.164) → first 5 + last 3, 5 redacted.
            'ph mobile' => ['+639090000123', '+6390•••••123'],
            // 12 chars → first 5 + last 3, 4 redacted (the minimum for the phone rule).
            'twelve chars' => ['+63909000012', '+6390••••012'],
            // 11 chars → too short for 5+3 (fewer than 4 hidden) → generic policy.
            'local format' => ['09090000123', '090••••••23'],
            'eight chars half redacted' => ['12345678', '12••••78'],
            'short is fully masked' => ['12345', '•••••'],
            'null passes through' => [null, null],
            'empty passes through' => ['', ''],
        ];
    }

    /**
     * A phone number shows its first five and last three characters (country code +
     * prefix, and a recognisable tail); shorter values fall back to the generic policy.
     */
    #[DataProvider('mobiles')]
    public function test_mask_mobile(?string $input, ?string $expected): void
    {
        $this->assertSame($expected, PiiMasker::maskMobile($input));
    }

    /**
     * An ASCII surface can pick the mask character.
     */
    public function test_mask_mobile_with_ascii_mask_char(): void
    {
        $this->assertSame('+6394*****094', PiiMasker::maskMobile('+639412345094', '*'));
    }

    /**
     * Every phone number hides at least four characters — or, when it is too short
     * for the phone rule and falls back to the generic policy, at least half.
     */
    public function test_mask_mobile_always_hides_enough(): void
    {
        foreach (['123456', '1234567', '12345678', '123456789', '09090000123', '+63909000012', '+639090000123'] as $number) {
            $masked = PiiMasker::maskMobile($number);
            $hidden = mb_substr_count($masked, '•');

            $this->assertGreaterThanOrEqual(min(4, (int) ceil(mb_strlen($number) / 2)), $hidden, "hid too little of {$number}");
        }
    }

    /**
     * maskIdentifier picks the email or mobile rule by shape and is idempotent — an
     * already-masked value masks to itself (safe at write time and on read).
     */
    public function test_mask_identifier_by_shape_and_idempotent(): void
    {
        $this->assertSame('u•••@example.com', PiiMasker::maskIdentifier('user@example.com'));
        $this->assertSame('j•••@example.com', PiiMasker::maskIdentifier('j•••@example.com'));
        $this->assertSame('k•••@gmail.com', PiiMasker::maskIdentifier('kristel@gmail.com'));
        $this->assertSame('k•••@gmail.com', PiiMasker::maskIdentifier('k•••@gmail.com'));
        $this->assertSame('+6391•••••567', PiiMasker::maskIdentifier('+639171234567'));
        $this->assertSame('+6391•••••567', PiiMasker::maskIdentifier('+6391•••••567'));
        $this->assertNull(PiiMasker::maskIdentifier(null));
        $this->assertSame('', PiiMasker::maskIdentifier(''));
    }

    /**
     * maskDigitRuns blanks standalone 4–8 digit runs (OTP/PIN) while keeping the
     * surrounding text and short/long digit groups intact.
     */
    public function test_mask_digit_runs(): void
    {
        $this->assertSame('Your OTP is ****** now', PiiMasker::maskDigitRuns('Your OTP is 483920 now'));
        $this->assertSame('PIN **** and code ******', PiiMasker::maskDigitRuns('PIN 1234 and code 987654'));
        // 3-digit and 9+-digit runs are not OTP-shaped, left alone.
        $this->assertSame('room 101 ref 1234567890', PiiMasker::maskDigitRuns('room 101 ref 1234567890'));
        $this->assertNull(PiiMasker::maskDigitRuns(null));
    }
}
