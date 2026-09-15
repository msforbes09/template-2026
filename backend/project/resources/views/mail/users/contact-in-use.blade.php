@extends('mail.layout.main')

@section('body')
    <x-mail-body>
        <x-slot:banner>
        </x-slot:banner>

        <x-slot:content>
            <p style="line-height: 150%">Hello,</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Someone tried to add this email address to a different {{ config('app.name') }} account, but it is already registered to yours.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">No action is needed — your account is unchanged, and the email was not added to any other account. If this wasn't you, consider reviewing your account security.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Sincerely,<br /><strong>The {{ config('app.name') }} Team</strong></p>
        </x-slot:content>
    </x-mail-body>
@endsection
