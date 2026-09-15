<x-mail::message>
# Hello {{ $administrator->first_name }},

A temporary password has been issued for your {{ config('app.name') }} administrator account.

**Temporary password:** `{{ $temporaryPassword }}`

Please sign in and change it as soon as possible — you will be prompted to set a new password on first use.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
