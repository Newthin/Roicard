<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Services\QRService;
use Illuminate\Http\Response;

class QRController extends Controller
{
    public function __construct(
        protected QRService $qrService
    ) {}

    public function show(string $slug): Response
    {
        $profile = Profile::where('slug', $slug)->firstOrFail();

        $url = config('app.frontend_url', config('app.url')) . '/' . $profile->slug;

        $qrSvg = $this->qrService->generate($url);

        return response($qrSvg, 200)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=86400');
    }
}
