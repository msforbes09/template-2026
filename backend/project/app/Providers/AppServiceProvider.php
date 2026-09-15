<?php

namespace App\Providers;

use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Addresses\Barangays\Barangay;
use App\Models\Addresses\Countries\Country;
use App\Models\Addresses\Municipalities\Municipality;
use App\Models\Addresses\Provinces\Province;
use App\Models\Addresses\Regions\Region;
use App\Models\Administrators\Administrator;
use App\Models\Broadcasts\Broadcast;
use App\Models\Contents\Content;
use App\Models\Documentations\Documentation;
use App\Models\Misc\Audits\Audit;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Misc\Connections\Connection;
use App\Models\Misc\Files\File;
use App\Models\Misc\Galleries\Gallery;
use App\Models\Misc\Otps\Otp;
use App\Models\Notifications\Notification;
use App\Models\Users\User;
use App\Notifications\Channels\DatabaseChannel;
use App\Services\Security\PiiKeyGuard;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SmsSender;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Notifications\Channels\DatabaseChannel as BaseDatabaseChannel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use OpenSearch\Client;
use OpenSearch\Laravel\Client\ClientBuilderInterface;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // The notifications table auto-increments; drop the framework's stamped uuid.
        $this->app->bind(BaseDatabaseChannel::class, DatabaseChannel::class);

        // Outbound SMS: the template ships a log-only sender; bind a real provider here.
        $this->app->bind(SmsSender::class, LogSmsSender::class);

        // Resolve the raw OpenSearch client from the default connection, so the
        // future read phase (raw aggregation/list DSL) can inject OpenSearch\Client.
        $this->app->bind(Client::class, fn ($app) => $app->make(ClientBuilderInterface::class)->default());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->forceDebugOffInProduction();
        $this->forceDocsOffInProduction();
        $this->removeUnusedFrameworkDefaultDisk();
        // Read from config, not env(): once `config:cache` runs (production boot via
        // entry-point.sh's `artisan optimize`) env() returns null, which would make
        // this guard throw on every boot even with the key set.
        PiiKeyGuard::assert($this->app->isProduction(), config('app.pii_key_explicit'));

        // Store polymorphic types by short model name (no namespace).
        Relation::enforceMorphMap([
            'Administrator' => Administrator::class,
            'Role' => Role::class,
            'Permission' => Permission::class,
            'PermissionGroup' => PermissionGroup::class,
            'Otp' => Otp::class,
            'Audit' => Audit::class,
            'AuthAttempt' => AuthAttempt::class,
            'Connection' => Connection::class,
            'Notification' => Notification::class,
            'Broadcast' => Broadcast::class,
            'File' => File::class,
            'Gallery' => Gallery::class,
            'User' => User::class,
            'Content' => Content::class,
            'Documentation' => Documentation::class,
            'Country' => Country::class,
            'Region' => Region::class,
            'Province' => Province::class,
            'Municipality' => Municipality::class,
            'Barangay' => Barangay::class,
        ]);

        // Group-level default for every /api/v1/* route (the `api` middleware group).
        // A coarse fail-safe backstop keyed per authenticated principal (admin or
        // user), else the client IP; the tight per-route limiters below stack on
        // top and govern where they apply. CORS preflight is exempt.
        RateLimiter::for('api', function (Request $request) {
            if ($request->isMethod('OPTIONS')) {
                return Limit::none();
            }

            $actor = $request->user('administrators') ?? $request->user('users');
            $key = $actor ? $actor->getMorphClass().':'.$actor->getKey() : (string) $request->ip();

            return Limit::perMinute((int) config('api.rate_limit', 60))->by('api:'.$key);
        });

        // Throttle login by client IP.
        RateLimiter::for('authenticate', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        // Throttle the second factor too. The OTP's own lockout caps guesses against a
        // single handle, but nothing capped requests against the endpoint itself — so
        // it was the one auth endpoint an attacker could hammer freely.
        RateLimiter::for('two-factor', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        // Registration is keyed on the (normalized) email, NOT the IP: many users may
        // register from one venue/office NAT, so an IP limiter would collectively lock
        // them out. Email-keying caps OTP requests per inbox; Turnstile + OtpService's
        // own cooldown/lockout cover bulk cross-email abuse.
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(5)
            ->by('register:'.$this->channelKey($request)));

        // User login by email (crowds share a NAT'd IP; Turnstile carries bulk abuse).
        RateLimiter::for('user-authenticate', fn (Request $request) => Limit::perMinute(5)
            ->by('user-authenticate:'.$this->channelKey($request)));

        // User 2FA completion, keyed per handshake handle. The OTP's own lockout is the
        // primary protection; this is a light backstop that avoids the shared-IP problem.
        RateLimiter::for('user-two-factor', fn (Request $request) => Limit::perMinute(10)
            ->by('user-two-factor:'.hash('sha256', (string) $request->input('auth_token'))));

        // Authenticated password change, capped per account.
        RateLimiter::for('user-change-password', fn (Request $request) => Limit::perMinute(5)
            ->by('user-change-password:'.(string) ($request->user()?->getKey() ?? $request->ip())));

        // Self-service account deletion, capped per account.
        RateLimiter::for('user-delete-account', fn (Request $request) => Limit::perMinute(5)
            ->by('user-delete-account:'.(string) ($request->user('users')?->getKey() ?? $request->ip())));

        // Profile completion, capped per account.
        RateLimiter::for('complete-profile', fn (Request $request) => Limit::perMinute(5)
            ->by('complete-profile:'.(string) ($request->user('users')?->getKey() ?? $request->ip())));

        // Forgot / reset password, email-keyed (crowds share a NAT'd IP); the OTP
        // cooldown/lockout is the second layer, Turnstile the third.
        RateLimiter::for('user-forgot-password', fn (Request $request) => Limit::perMinute(5)
            ->by('user-forgot-password:'.$this->channelKey($request)));
        RateLimiter::for('user-reset-password', fn (Request $request) => Limit::perMinute(5)
            ->by('user-reset-password:'.$this->channelKey($request)));

        // Registration OTP verification — the anti-enumeration flow. Keyed on the
        // channel identifier (email OR mobile, so SMS callers don't share one
        // bucket), falling back to IP for a malformed body; caps how fast the
        // now-uniform failure envelope can be probed at scale.
        RateLimiter::for('verify-registration', fn (Request $request) => Limit::perMinute(10)
            ->by('verify-registration:'.hash('sha256', Str::lower(trim(
                (string) ($request->input('email') ?? $request->input('mobile_number') ?? $request->ip())
            )))));

        // Shared OTP resend — keyed on the resend_token (per OTP session), so an
        // attacker with many tokens still can't flood email/SMS from one IP unchecked.
        RateLimiter::for('otp-resend', fn (Request $request) => Limit::perMinute(5)
            ->by('otp-resend:'.hash('sha256', (string) $request->input('resend_token', $request->ip()))));

        // File uploads, capped per authenticated principal (admin OR user — the
        // endpoint is shared). The upload route carries no permission gate on purpose
        // (users have no permissions, and the uploader owns the file), so a spatie
        // `abilities:` check cannot apply; this throttle is what bounds the endpoint so
        // it cannot be hammered to exhaust storage. Keyed on morph class + id so an
        // admin and a user with the same numeric id never share a bucket.
        RateLimiter::for('upload-file', function (Request $request) {
            $actor = $request->user();
            $key = $actor ? $actor->getMorphClass().':'.$actor->getKey() : (string) $request->ip();

            return Limit::perMinute(20)->by('upload-file:'.$key);
        });

        // Authenticated add / verify a contact channel, capped per account.
        RateLimiter::for('user-add-contact', fn (Request $request) => Limit::perMinute(5)
            ->by('user-add-contact:'.(string) ($request->user('users')?->getKey() ?? $request->ip())));
        RateLimiter::for('user-verify-contact', fn (Request $request) => Limit::perMinute(10)
            ->by('user-verify-contact:'.(string) ($request->user('users')?->getKey() ?? $request->ip())));
    }

    /**
     * A per-account rate-limiter key for the channel-aware auth endpoints: the
     * submitted email, else the mobile number (SMS channel), else the caller IP —
     * so SMS-channel callers each get their own bucket instead of all sharing the
     * empty-email bucket (F11).
     */
    private function channelKey(Request $request): string
    {
        $identifier = (string) ($request->input('email') ?: $request->input('mobile_number') ?: '');

        return $identifier !== ''
            ? hash('sha256', Str::lower(trim($identifier)))
            : 'ip:'.$request->ip();
    }

    /**
     * Debug mode is never on in production, whatever the environment file says.
     *
     * A `.env` copied from the template and never edited would ship `APP_DEBUG=true`, and
     * a debug error page prints the configuration and a stack trace — database password,
     * app key, partner secrets and all. One unhandled exception is then a full disclosure.
     *
     * Forced off rather than merely warned about: a log line nobody reads is not a
     * control. And forced rather than aborted: refusing to boot would trade a possible
     * leak for a certain outage.
     */
    private function forceDebugOffInProduction(): void
    {
        if (! $this->app->isProduction() || ! config('app.debug')) {
            return;
        }

        config(['app.debug' => false]);

        Log::critical('APP_DEBUG was enabled in production and has been forced off. Fix the environment file — a debug error page discloses configuration and secrets.');
    }

    /**
     * `config/filesystems.php`'s `disks` array is one of the few keys Laravel's
     * `LoadConfiguration` bootstrapper merges rather than replaces (see
     * `mergeableOptions()`), so the framework's own default `s3` disk (an
     * AWS-shaped stub this app no longer uses — file storage moved to
     * Cloudflare R2's `r2`/`r2-public` disks) survives even though this app's
     * config file never defines it. Drop it so nothing accidentally resolves it.
     */
    private function removeUnusedFrameworkDefaultDisk(): void
    {
        $disks = config('filesystems.disks');
        unset($disks['s3']);
        config(['filesystems.disks' => $disks]);
    }

    /**
     * The Swagger docs are never served in production, whatever the environment file
     * says. They enumerate every endpoint, parameter, validation rule and error
     * shape — a complete attack-surface map. Forced off (like APP_DEBUG) rather than
     * relying on the `APP_ENV !== 'production'` default, which a stray DOCS_ENABLED=true
     * would override.
     */
    private function forceDocsOffInProduction(): void
    {
        if (! $this->app->isProduction() || ! config('app.docs_enabled')) {
            return;
        }

        config(['app.docs_enabled' => false]);

        Log::critical('DOCS_ENABLED was on in production and has been forced off. The API documentation maps every endpoint and must not be public.');
    }
}
