@extends('mail.layout.main')

@section('body')
    <x-mail-body>
        <x-slot:banner>
        </x-slot:banner>

        <x-slot:content>
            <p style="line-height: 150%">Hello,</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">We received a request to reset the password for this email, but there is no password-based {{ config('app.name') }} account associated with it.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">If you meant to sign up, you can create an account with this email address. If you didn't request this, you can safely ignore this email.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Sincerely,<br /><strong>The {{ config('app.name') }} Team</strong></p>
        </x-slot:content>
    </x-mail-body>
@endsection
