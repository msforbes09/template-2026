<?php

namespace App\Console\Commands;

use App\Events\Administrators\AdministratorBroadcast;
use Illuminate\Console\Command;

/**
 * Broadcasts a service-status payload to every authenticated administrator over
 * the private `administrators` channel (a WebSocket smoke test).
 */
class TestBroadcastAdminCommand extends Command
{
    /**
     * The console command signature.
     *
     * @var string
     */
    protected $signature = 'test:broadcast-admin';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Broadcast a service-status payload to all authenticated admins (WebSocket smoke test)';

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

        AdministratorBroadcast::dispatch($payload);

        $this->info('Broadcasted to admins: '.json_encode($payload));

        return self::SUCCESS;
    }
}
