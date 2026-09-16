@extends('mail.layout.main')

@section('body')
    <x-mail-body>
        <x-slot:banner>
        </x-slot:banner>

        <x-slot:content>
            <p style="line-height: 150%">Hello,</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Welcome back! This email address belongs to a previously deleted {{ config('app.name') }} account. Enter the code below to recover it with your new password:</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%"><strong style="font-size: 24px; letter-spacing: 4px;">{{ $pin }}</strong></p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">The code expires in 5 minutes. If this was not you, you can safely ignore this email.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Sincerely,<br /><strong>The {{ config('app.name') }} Team</strong></p>
        </x-slot:content>
    </x-mail-body>
@endsection
