@props(['padding' => '40px 0px'])

<table id="u_body" style="border-collapse: collapse; table-layout: fixed; border-spacing: 0; vertical-align: top; min-width: 320px; margin: 0 auto; background-color: #ecf0f1; width: 100%;" cellpadding="0" cellspacing="0">
    <tbody>
        <tr style="vertical-align: top">
            <td style="word-break: break-word; border-collapse: collapse !important; vertical-align: top;">
                <div class="u-row-container" style="padding: {{ $padding }}; background-color: transparent">
                    <div class="u-row" style="margin: 0 auto; min-width: 320px; max-width: 550px; overflow-wrap: break-word; word-break: break-word; background-color: transparent;">
                        <div style="border-collapse: collapse; display: table; width: 100%; height: 100%; background-color: transparent;">
                            <div class="u-col u-col-100" style="max-width: 320px; min-width: 550px; display: table-cell; vertical-align: top;">
                                <div style="background-color: #ffffff; height: 100%; width: 100% !important; border-radius: 8px;">
                                    <div style="box-sizing: border-box; height: 100%; padding: 0px;">

                                        {{-- Logo --}}
                                        <table style="font-family: helvetica, sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                            <tbody><tr>
                                                <td class="v-container-padding-padding" style="overflow-wrap: break-word; word-break: break-word; padding: 40px 10px 10px; font-family: helvetica, sans-serif;" align="center">
                                                    @if (config('mail.logo_url'))
                                                        <img align="center" border="0" src="{{ config('mail.logo_url') }}" alt="{{ config('app.name') }}" title="{{ config('app.name') }}" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; clear: both; display: inline-block !important; border: none; height: auto; float: none; max-width: 160px; width: 40%;" width="160" />
                                                    @else
                                                        <span style="font-size: 20px; font-weight: bold; color: #34495e;">{{ config('app.name') }}</span>
                                                    @endif
                                                </td>
                                            </tr></tbody>
                                        </table>

                                        {{-- Banner (OTP / notification image) --}}
                                        <table style="font-family: helvetica, sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                            <tbody><tr>
                                                <td class="v-container-padding-padding" style="overflow-wrap: break-word; word-break: break-word; padding: 20px 10px 20px; font-family: helvetica, sans-serif;" align="center">
                                                    {{ $banner }}
                                                </td>
                                            </tr></tbody>
                                        </table>

                                        {{-- Content --}}
                                        <table style="font-family: helvetica, sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                            <tbody><tr>
                                                <td class="v-container-padding-padding" style="overflow-wrap: break-word; word-break: break-word; padding: 10px 40px; font-family: helvetica, sans-serif;" align="left">
                                                    <div style="font-size: 14px; color: #34495e; line-height: 150%; text-align: left; word-wrap: break-word;">
                                                        {{ $content }}
                                                    </div>
                                                </td>
                                            </tr></tbody>
                                        </table>

                                        {{-- Divider --}}
                                        <table style="font-family: helvetica, sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                            <tbody><tr>
                                                <td class="v-container-padding-padding" style="padding: 10px 40px;" align="left">
                                                    <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; table-layout: fixed; border-spacing: 0; vertical-align: top; border-top: 1px solid #ced4d9;">
                                                        <tbody><tr style="vertical-align: top"><td style="word-break: break-word; border-collapse: collapse !important; vertical-align: top; font-size: 0px; line-height: 0px;"><span>&#160;</span></td></tr></tbody>
                                                    </table>
                                                </td>
                                            </tr></tbody>
                                        </table>

                                        {{-- Automated notice + how to reach a human --}}
                                        <table style="font-family: helvetica, sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                            <tbody><tr>
                                                <td class="v-container-padding-padding" style="padding: 10px 40px; font-family: helvetica, sans-serif;" align="left">
                                                    <div style="font-size: 12px; color: #34495e; line-height: 150%; text-align: center; word-wrap: break-word;">
                                                        <p style="line-height: 150%">This is an automated message from {{ config('app.name') }}. Please do not reply to this email. If you have any questions or concerns, contact our support team at <a href="mailto:{{ config('mail.support_address') }}?subject={{ rawurlencode(config('app.name').' - Support') }}" target="_blank" style="color: #2980b9; font-weight: bold; text-decoration: underline;">{{ config('mail.support_address') }}</a>. We are always here to help.</p>
                                                    </div>
                                                </td>
                                            </tr></tbody>
                                        </table>

                                        {{-- Copyright --}}
                                        <table style="font-family: helvetica, sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                            <tbody><tr>
                                                <td class="v-container-padding-padding" style="padding: 10px 40px 40px; font-family: helvetica, sans-serif;" align="left">
                                                    <div style="font-size: 12px; line-height: 150%; text-align: center; word-wrap: break-word;">
                                                        <p style="line-height: 150%"><span style="color: #34495e;">&copy; {{ config('app.name') }} {{ date('Y') }}</span></p>
                                                    </div>
                                                </td>
                                            </tr></tbody>
                                        </table>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    </tbody>
</table>
