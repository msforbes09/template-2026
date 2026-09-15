<?php

namespace App\Jobs;

use App\Services\Sms\SmsSender;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Queues a single outbound SMS through the bound SmsSender. The one choke point
 * every text passes through, so "queue all SMS" holds by construction.
 *
 * `ShouldBeEncrypted` is load-bearing: the message may carry a live OTP PIN and
 * the number is PII, so the serialized payload must not sit in the `jobs` /
 * `failed_jobs` tables in the clear.
 */
class SendSms implements ShouldBeEncrypted, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * Create a new job instance, pinned to the dedicated `sms` queue.
     */
    public function __construct(
        public string $number,
        public string $message,
        public ?string $userType = null,
        public ?int $userId = null,
    ) {
        $this->onQueue('sms');
    }

    /**
     * The morph causer (`user_type`/`user_id`) to attribute the connection log to,
     * or null when the text has no known initiator (registration OTPs, the test
     * command). Carried on the job because a queue worker has no authenticated
     * guard to resolve it from.
     *
     * @return array{user_type: string, user_id: int}|null
     */
    public function causer(): ?array
    {
        return $this->userType !== null && $this->userId !== null
            ? ['user_type' => $this->userType, 'user_id' => $this->userId]
            : null;
    }

    /**
     * Send the text through the bound provider, attributed to the carried causer.
     */
    public function handle(SmsSender $sender): void
    {
        $sender->send($this->number, $this->message, $this->causer());
    }
}
