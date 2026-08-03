@props(['url'])
<tr>
<td class="header">
    <a href="{{ $url }}" style="display: inline-block;">
        <img src="{{ config('app.logo_url', rtrim(config('app.frontend_url', '/'), '/') . '/images/logo.png') }}" class="logo" alt="Roicard Logo" style="width: 320px; height: auto; max-height: 130px;">
    </a>
</td>
</tr>