<?php

namespace App\Console\Commands;

use App\Jobs\SendSms;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

/**
 * Queues a test SMS to verify the bound SmsSender and the `sms` queue.
 */
class TestSmsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:sms {number : The recipient mobile number (+639XXXXXXXXX)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Queue a test SMS to verify the bound SmsSender and the sms queue';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $number = (string) $this->argument('number');

        if (Validator::make(['number' => $number], ['number' => ['required', 'regex:/^\+639\d{9}$/']])->fails()) {
            $this->error("'{$number}' is not a valid mobile number (expected +639XXXXXXXXX).");

            return self::FAILURE;
        }

        SendSms::dispatch($number, config('app.name').' SMS test — your messaging gateway is working.');

        $this->info("Test SMS queued to {$number} on the 'sms' queue.");

        return self::SUCCESS;
    }
}
