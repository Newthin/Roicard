@props(['url'])
<tr>
<td class="header">
    <a href="{{ $url }}" style="display: inline-block;">
        <img src="{{ config('app.logo_url', rtrim(config('app.frontend_url', '/'), '/') . '/logo.png') }}" class="logo" alt="Roicard Logo" style="max-height: 45px;">
    </a>
</td>
</tr>