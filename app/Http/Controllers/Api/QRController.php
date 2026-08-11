<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RecordAnalyticsJob;
use App\Models\Profile;
use App\Services\QRService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;

class QRController extends Controller
{
    public function __construct(
        protected QRService $qrService
    ) {}

    /**
     * Scan entry point. The QR code encodes this URL; hitting it records a
     * real qr_scan event then redirects the visitor to the public profile.
     */
    public function show(string $slug): RedirectResponse
    {
        $profile = Profile::where('slug', $slug)->firstOrFail();

        // Record a real qr_scan event so the member's analytics reflects scans.
        RecordAnalyticsJob::dispatch($profile->user_id, 'qr_scan');

        return redirect($this->profileUrl($slug))
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache');
    }

    /**
     * Serves the QR SVG for display/download in the app. The QR encodes the
     * scan endpoint (not the profile URL directly) so scans are attributable.
     */
    public function image(string $slug): Response
    {
        $profile = Profile::where('slug', $slug)->firstOrFail();

        $qrSvg = $this->qrService->generate($this->scanUrl($slug));

        return response($qrSvg, 200)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=86400');
    }

    protected function profileUrl(string $slug): string
    {
        return config('app.frontend_url', config('app.url')) . '/' . $slug;
    }

    protected function scanUrl(string $slug): string
    {
        return config('app.frontend_url', config('app.url')) . '/api/qr/' . $slug;
    }
}
