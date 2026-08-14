<x-mail::message>
# Hi {{ $firstName }},

Someone just viewed your Roicard profile. 📈

Your digital business card is working for you — keep sharing it to grow your reach.

<x-mail::button :url="config('app.frontend_url') . '/dashboard/analytics'">
View Your Analytics
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>