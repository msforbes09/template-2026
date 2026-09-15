<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
    <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG /><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <!--<![endif]-->
    <title>{{ config('app.name') }}</title>

    <style type="text/css">
        @media only screen and (min-width: 570px) {
            .u-row { width: 550px !important; }
            .u-row .u-col { vertical-align: top; }
            .u-row .u-col-100 { width: 550px !important; }
        }
        @media (max-width: 570px) {
            .u-row-container { max-width: 100% !important; padding-left: 0px !important; padding-right: 0px !important; }
            .u-row .u-col { min-width: 320px !important; max-width: 100% !important; display: block !important; }
            .u-row { width: 100% !important; }
            .u-col { width: 100% !important; }
            .u-col > div { margin: 0 auto; }
        }
        body { margin: 0; padding: 0; }
        table, tr, td { vertical-align: top; border-collapse: collapse; }
        p { margin: 0; }
        * { line-height: inherit; }
        a[x-apple-data-detectors="true"] { color: inherit !important; text-decoration: none !important; }
        table, td { color: #34495e; }
        @media (max-width: 480px) {
            .v-container-padding-padding { padding: 10px 20px !important; }
        }
    </style>
</head>

<body class="clean-body u_body" style="margin: 0; padding: 0; -webkit-text-size-adjust: 100%; background-color: #ecf0f1; color: #34495e;">
    @yield('body')
</body>

</html>
