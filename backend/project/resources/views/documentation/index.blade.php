<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }} — API Documentation</title>
    <style>
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #fafafa;
            color: #1b1b1b;
        }
        main { width: 100%; max-width: 640px; padding: 2.5rem 1.5rem; }
        header { margin-bottom: 2rem; }
        h1 { margin: 0 0 .35rem; font-size: 1.6rem; }
        header p { margin: 0; color: #666; }
        ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; }
        a.card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.25rem;
            border: 1px solid #e3e3e3;
            border-radius: 10px;
            background: #fff;
            text-decoration: none;
            color: inherit;
            transition: border-color .15s ease, transform .15s ease;
        }
        a.card:hover { border-color: #4a90d9; transform: translateY(-1px); }
        a.card .title { font-weight: 600; }
        a.card .arrow { color: #4a90d9; font-size: 1.1rem; }
        footer { margin-top: 2rem; color: #999; font-size: .85rem; }
        @media (prefers-color-scheme: dark) {
            body { background: #1b1b1b; color: #e7e7e7; }
            header p { color: #9a9a9a; }
            a.card { background: #262626; border-color: #383838; }
        }
    </style>
</head>
<body>
    <main>
        <header>
            <h1>API Documentation</h1>
            <p>Select an API below to view its interactive reference.</p>
        </header>

        <ul>
            @foreach ($groups as $group)
                <li>
                    <a class="card" href="{{ $group['url'] }}">
                        <span class="title">{{ $group['title'] }}</span>
                        <span class="arrow">&rarr;</span>
                    </a>
                </li>
            @endforeach
        </ul>

        <footer>{{ config('app.name') }} &middot; v{{ config('app.version') }}</footer>
    </main>
</body>
</html>
