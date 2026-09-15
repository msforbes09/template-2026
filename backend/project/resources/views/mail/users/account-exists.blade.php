@extends('mail.layout.main')

@section('body')
    <x-mail-body>
        <x-slot:banner>
        </x-slot:banner>

        <x-slot:content>
            <p style="line-height: 150%">Hello,</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Someone tried to register a new {{ config('app.name') }} account with this email address, but you already have one.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">If this was you, please sign in instead — or reset your password if you've forgotten it. If it wasn't you, no action is needed; your account is unchanged.</p>
            <p style="line-height: 150%">&nbsp;</p>
            <p style="line-height: 150%">Sincerely,<br /><strong>The {{ config('app.name') }} Team</strong></p>
        </x-slot:content>
    </x-mail-body>
@endsection
