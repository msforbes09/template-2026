<?php

declare(strict_types=1);

return [
    'default' => env('OPENSEARCH_CONNECTION', 'default'),
    'connections' => [
        'default' => [
            'hosts' => [
                env('OPENSEARCH_HOST', 'localhost:9200'),
            ],
            // Certificate verification, ON everywhere real: a deployed cluster
            // presents a cert that verifies, and this must stay true there.
            // Turn it off ONLY to reach a cluster through a local tunnel,
            // where TLS terminates on a self-signed `localhost` cert that can
            // never verify — the tunnel itself protects that hop. Without
            // this the client cannot be told, and the failure surfaces as the
            // unhelpful "No alive nodes found in your cluster".
            'sslVerification' => env('OPENSEARCH_SSL_VERIFY', true),
        ],
    ],
];
