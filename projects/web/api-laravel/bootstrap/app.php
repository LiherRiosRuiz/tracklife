<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Traefik is the only reverse-proxy hop between any client and this
        // app (see docker-compose.yml: traefik_net + backend_net are the
        // only networks this container is on, and Traefik is the only thing
        // that talks to it over them). Without trusting Traefik,
        // $request->ip() returns Traefik's container-internal IP for every
        // request, collapsing every client's rate-limit bucket (throttle:
        // api-global / auth-strict) into one shared bucket.
        //
        // There is no fixed Traefik IP to pin here: Docker assigns
        // traefik_net/backend_net addresses dynamically per container/per
        // recreate. Trusting the standard private ranges instead is the
        // conventional "trust any reverse proxy on my own private Docker
        // network" pattern, and is safe in this topology specifically
        // because traefik_net/backend_net are `external: true` bridge
        // networks that are not directly internet-reachable — only
        // Traefik's own public-facing entrypoint is. This is a deliberate
        // choice given the deployment topology, not an oversight.
        $middleware->trustProxies(
            at: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
        );

        // Intentionally NOT calling $middleware->statefulApi() here.
        //
        // statefulApi() adds Sanctum's EnsureFrontendRequestsAreStateful
        // middleware, which decides whether to apply CSRF/session/cookie
        // handling purely by checking the request's Origin/Referer host
        // against config('sanctum.stateful') (SANCTUM_STATEFUL_DOMAINS) —
        // it does NOT check whether the request carries a Bearer token or
        // is otherwise already authenticated. Since that list includes the
        // frontend's real origin (app.tracklife.test / tracklife.test),
        // every real-browser request (which always sends Origin/Referer)
        // was being forced through EncryptCookies+StartSession+
        // VerifyCsrfToken, which rejects it for lacking a CSRF token —
        // producing the 419 "CSRF token mismatch" seen when marking a
        // favorite from the actual app, even though `curl` (no
        // Origin/Referer) sailed through with the same Bearer token.
        //
        // This app has no cookie/session-based auth anywhere: every login
        // (AuthController::login/register) only ever issues a Sanctum
        // personal-access Bearer token, never calls Auth::login(), and no
        // route relies on the 'web' session guard. CSRF protection exists
        // specifically to protect cookie-authenticated requests; a pure
        // Bearer-token API has no CSRF exposure to protect, so enabling
        // Sanctum's stateful/CSRF handling here only broke real usage
        // without buying any real security. See tests/Feature/
        // CsrfBrowserRequestTest.php for the regression coverage.
        $middleware->api(prepend: [
            HandleCors::class,
        ], append: [
            // Sane API-wide baseline rate limit. Uses a distinct prefix so its
            // counter never shares a cache key with the stricter per-route
            // throttles (e.g. auth-strict on /auth/login, /auth/register).
            'throttle:60,1,api-global',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
