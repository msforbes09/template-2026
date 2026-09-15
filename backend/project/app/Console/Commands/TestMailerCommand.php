<?php

namespace App\Console\Commands;

use App\Mail\TestMailerMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

/**
 * Queues a test email to verify the mailer and the `mailer` queue.
 */
class TestMailerCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:mailer {email : The recipient email address}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Queue a test email to verify the mailer and the mailer queue';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = (string) $this->argument('email');

        if (Validator::make(['email' => $email], ['email' => ['required', 'email']])->fails()) {
            $this->error("'{$email}' is not a valid email address.");

            return self::FAILURE;
        }

        Mail::to($email)->queue((new TestMailerMail)->onQueue('mailer'));

        $this->info("Test email queued to {$email} on the 'mailer' queue.");

        return self::SUCCESS;
    }
}
