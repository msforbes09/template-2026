<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $documentationTitle }}</title>
    <link rel="stylesheet" type="text/css" href="{{ l5_swagger_asset($documentation, 'swagger-ui.css') }}">
    <link rel="icon" type="image/png" href="{{ l5_swagger_asset($documentation, 'favicon-32x32.png') }}" sizes="32x32"/>
    <link rel="icon" type="image/png" href="{{ l5_swagger_asset($documentation, 'favicon-16x16.png') }}" sizes="16x16"/>
    <style>
    html
    {
        box-sizing: border-box;
        overflow: -moz-scrollbars-vertical;
        overflow-y: scroll;
    }
    *,
    *:before,
    *:after
    {
        box-sizing: inherit;
    }

    body {
      margin:0;
      background: #fafafa;
    }
    </style>
    @if(config('l5-swagger.defaults.ui.display.dark_mode'))
        <style>
            body#dark-mode,
            #dark-mode .scheme-container {
                background: #1b1b1b;
            }
            #dark-mode .scheme-container,
            #dark-mode .opblock .opblock-section-header{
                box-shadow: 0 1px 2px 0 rgba(255, 255, 255, 0.15);
            }
            #dark-mode .operation-filter-input,
            #dark-mode .dialog-ux .modal-ux,
            #dark-mode input[type=email],
            #dark-mode input[type=file],
            #dark-mode input[type=password],
            #dark-mode input[type=search],
            #dark-mode input[type=text],
            #dark-mode textarea{
                background: #343434;
                color: #e7e7e7;
            }
            #dark-mode .title,
            #dark-mode li,
            #dark-mode p,
            #dark-mode table,
            #dark-mode label,
            #dark-mode .opblock-tag,
            #dark-mode .opblock .opblock-summary-operation-id,
            #dark-mode .opblock .opblock-summary-path,
            #dark-mode .opblock .opblock-summary-path__deprecated,
            #dark-mode h1,
            #dark-mode h2,
            #dark-mode h3,
            #dark-mode h4,
            #dark-mode h5,
            #dark-mode .btn,
            #dark-mode .tab li,
            #dark-mode .parameter__name,
            #dark-mode .parameter__type,
            #dark-mode .prop-format,
            #dark-mode .loading-container .loading:after{
                color: #e7e7e7;
            }
            #dark-mode .opblock-description-wrapper p,
            #dark-mode .opblock-external-docs-wrapper p,
            #dark-mode .opblock-title_normal p,
            #dark-mode .response-col_status,
            #dark-mode table thead tr td,
            #dark-mode table thead tr th,
            #dark-mode .response-col_links,
            #dark-mode .swagger-ui{
                color: wheat;
            }
            #dark-mode .parameter__extension,
            #dark-mode .parameter__in,
            #dark-mode .model-title{
                color: #949494;
            }
            #dark-mode table thead tr td,
            #dark-mode table thead tr th{
                border-color: rgba(120,120,120,.2);
            }
            #dark-mode .opblock .opblock-section-header{
                background: transparent;
            }
            #dark-mode .opblock.opblock-post{
                background: rgba(73,204,144,.25);
            }
            #dark-mode .opblock.opblock-get{
                background: rgba(97,175,254,.25);
            }
            #dark-mode .opblock.opblock-put{
                background: rgba(252,161,48,.25);
            }
            #dark-mode .opblock.opblock-delete{
                background: rgba(249,62,62,.25);
            }
            #dark-mode .loading-container .loading:before{
                border-color: rgba(255,255,255,10%);
                border-top-color: rgba(255,255,255,.6);
            }
            #dark-mode svg:not(:root){
                fill: #e7e7e7;
            }
            #dark-mode .opblock-summary-description {
                color: #fafafa;
            }
        </style>
    @endif
</head>

<body @if(config('l5-swagger.defaults.ui.display.dark_mode')) id="dark-mode" @endif>
<div id="swagger-ui"></div>

<script src="{{ l5_swagger_asset($documentation, 'swagger-ui-bundle.js') }}"></script>
<script src="{{ l5_swagger_asset($documentation, 'swagger-ui-standalone-preset.js') }}"></script>
<script>
    window.onload = function() {
        const urls = [];

        @foreach($urlsToDocs as $title => $url)
            urls.push({name: "{{ $title }}", url: "{{ $url }}"});
        @endforeach

        // Build a system
        const ui = SwaggerUIBundle({
            dom_id: '#swagger-ui',
            urls: urls,
            "urls.primaryName": "{{ $documentationTitle }}",
            tagsSorter: function (a, b) {
                var order = ['Registration', 'Authentication', 'Profile', 'Password', 'Activation', 'Users', 'eGov Events', 'Projects', 'Project Reviews', 'Catalog Reviews', 'ApiCatalogs', 'Access', 'Administrators', 'Contents', 'Documentations', 'Feature Flags', 'Horizon', 'OTP', 'Files'];
                var ia = order.indexOf(a);
                var ib = order.indexOf(b);
                if (ia === -1 && ib === -1) return a.localeCompare(b);
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            },
            operationsSorter: function (a, b) {
                // Explicit ordering per tag; anything not listed stays alphabetical.
                var order = [
                    // Authentication
                    'post/authenticate',
                    'post/two-factor-authenticate',
                    'post/egov-sso-authenticate',
                    'post/logout',
                    // Profile
                    'get/profile',
                    'put/profile',
                    'patch/profile/photo',
                    'post/profile/complete',
                    'post/profile/add-contact',
                    'post/profile/verify-contact',
                    'post/profile/submit-for-assessment',
                    // Password
                    'post/change-password',
                    // Administrators (list, store, show, update, toggle, password, delete)
                    'get/administrators',
                    'post/administrators',
                    'get/administrators/{administrator}',
                    'put/administrators/{administrator}',
                    'post/administrators/{administrator}/toggle-active-status',
                    'post/administrators/{administrator}/reset-password',
                    'post/administrators/{administrator}/sync-roles',
                    'delete/administrators/{administrator}',
                    // Roles
                    'get/roles',
                    'post/roles',
                    'get/roles/{role}',
                    'put/roles/{role}',
                    'post/roles/{role}/sync-permissions',
                    'delete/roles/{role}',
                    // Permissions
                    'get/permissions',
                    // Common: OTP, Files
                    'post/otp/resend',
                    'post/files/public',
                    'post/files/private',
                    // Contents (list, store, show, update, delete)
                    'get/contents',
                    'post/contents',
                    'get/contents/{identifier}',
                    'put/contents/{identifier}',
                    'delete/contents/{identifier}',
                    // Addresses (geographic hierarchy)
                    'get/countries',
                    'get/regions',
                    'get/provinces',
                    'get/municipalities',
                    'get/barangays',
                    // Users (directory, assessment workflow, then gateway usage last)
                    'get/users',
                    'get/users/{uuid}',
                    'post/users/{uuid}/toggle-assessment',
                    'post/users/{uuid}/approve',
                    'post/users/{uuid}/return',
                    'post/users/{uuid}/make-approved-developer',
                    'post/users/{uuid}/suspend',
                    'post/users/{uuid}/unsuspend',
                    'post/users/{uuid}/demote',
                    'patch/users/{uuid}/gateway-quota',
                    'get/users/{uuid}/gateway-logs',
                    'get/users/{uuid}/gateway-logs/{id}',
                    // eGov Events (public entry point, then the admin CRUD)
                    'get/egov-events',
                    'get/egov-events/{slug}',
                    'get/egov-events/{slug}/projects',
                    'post/egov-events',
                    'get/egov-events/{id}',
                    'put/egov-events/{id}',
                    'delete/egov-events/{id}',
                    // Projects (list, store, show, update, delete, then the review actions)
                    'get/projects',
                    'post/projects',
                    'get/projects/{uuid}',
                    'put/projects/{uuid}',
                    'delete/projects/{uuid}',
                    'post/projects/{uuid}/submit',
                    'post/projects/{uuid}/toggle-assessment',
                    'post/projects/{uuid}/publish',
                    'post/projects/{uuid}/toggle-publish',
                    'post/projects/{uuid}/send-back',
                    'put/projects/{uuid}/tags',
                    'get/project-tags',
                    // Catalog reviews (public thread, admin thread, citizen singleton + replies)
                    'get/api-catalogs/{identifier}/reviews',
                    'get/api-catalogs/{id}/reviews',
                    'get/api-catalogs/{identifier}/review',
                    'post/api-catalogs/{identifier}/review',
                    'put/api-catalogs/{identifier}/review',
                    'delete/api-catalogs/{identifier}/review',
                    'post/api-catalog-reviews/{uuid}/replies',
                    // Project reviews (public thread, admin thread, then the citizen singleton + replies)
                    'get/common/projects/{uuid}/reviews',
                    'get/projects/{uuid}/reviews',
                    'get/projects/{uuid}/review',
                    'post/projects/{uuid}/review',
                    'put/projects/{uuid}/review',
                    'delete/projects/{uuid}/review',
                    'post/project-reviews/{uuid}/replies',
                ];
                var ka = a.get('method') + a.get('path');
                var kb = b.get('method') + b.get('path');
                var ia = order.indexOf(ka);
                var ib = order.indexOf(kb);
                if (ia !== -1 || ib !== -1) {
                    if (ia === -1) return 1;
                    if (ib === -1) return -1;
                    return ia - ib;
                }
                return a.get('path').localeCompare(b.get('path'));
            },
            configUrl: {!! isset($configUrl) ? '"' . $configUrl . '"' : 'null' !!},
            validatorUrl: {!! isset($validatorUrl) ? '"' . $validatorUrl . '"' : 'null' !!},
            oauth2RedirectUrl: "{{ route('l5-swagger.'.$documentation.'.oauth2_callback', [], $useAbsolutePath) }}",

            requestInterceptor: function(request) {
                request.headers['X-CSRF-TOKEN'] = '{{ csrf_token() }}';
                return request;
            },

            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],

            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],

            layout: "StandaloneLayout",
            docExpansion : "{!! config('l5-swagger.defaults.ui.display.doc_expansion', 'none') !!}",
            // Hide the Schemas (models) section at the bottom of every doc page.
            defaultModelsExpandDepth: -1,
            deepLinking: true,
            filter: {!! config('l5-swagger.defaults.ui.display.filter') ? 'true' : 'false' !!},
            persistAuthorization: "{!! config('l5-swagger.defaults.ui.authorization.persist_authorization') ? 'true' : 'false' !!}",

        })

        window.ui = ui

        @if(in_array('oauth2', array_column(config('l5-swagger.defaults.securityDefinitions.securitySchemes'), 'type')))
        ui.initOAuth({
            usePkceWithAuthorizationCodeGrant: "{!! (bool)config('l5-swagger.defaults.ui.authorization.oauth2.use_pkce_with_authorization_code_grant') !!}"
        })
        @endif
    }
</script>
</body>
</html>
