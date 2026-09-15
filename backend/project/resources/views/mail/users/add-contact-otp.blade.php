@extends('mail.layout.main')

@section('body')
    <x-mail-body>
        <x-slot:banner>
        </x-slot:banner>

        <x-slot:content>
            <p style="line-height: 150%">Hello,</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Use the One-Time Password (OTP) below to add this email address to your {{ config('app.name') }} account.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Your verification code:</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%"><b style="font-weight: bold; font-size: 28px; letter-spacing: 4px;">{{ $pin }}</b></p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">This code expires shortly. If you didn't request it, you can safely ignore this email.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Sincerely,<br /><strong>The {{ config('app.name') }} Team</strong></p>
        </x-slot:content>
    </x-mail-body>
@endsection
