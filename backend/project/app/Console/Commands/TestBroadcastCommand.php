<?php

namespace App\Console\Commands;

use App\Events\TestBroadcast;
use Illuminate\Console\Command;

/**
 * Broadcasts a service-status payload over Reverb (a WebSocket smoke test).
 */
class TestBroadcastCommand extends Command
{
    /**
     * The console command signature.
     *
     * @var string
     */
    protected $signature = 'test:broadcast';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Broadcast a service-status payload over Reverb (WebSocket smoke test)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $timezone = config('app.timezone');

        $payload = [
            'name' => config('app.name'),
            'environment' => config('app.env'),
            'service_name' => 'WS',
            'server_time' => now()->timezone($timezone)->format('Y-m-d H:i:s'),
            'timezone' => $timezone,
            'version' => config('app.version'),
        ];

        TestBroadcast::dispatch($payload);

        $this->info('Broadcasted: '.json_encode($payload));

        return self::SUCCESS;
    }
}
