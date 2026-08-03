@props(['url'])
<tr>
<td class="header">
    <a href="{{ $url }}" style="display: inline-block;">
        <img src="{{ config('app.logo_url', rtrim(config('app.frontend_url', '/'), '/') . '/images/logo.png') }}" class="logo" alt="Roicard Logo" style="height: 130px; width: auto; max-width: 320px;">
    </a>
</td>
</tr>