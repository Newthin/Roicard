<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Growth\ExecutiveService;
use App\Services\QRService;
use Illuminate\Http\Response;

class ReferralController extends Controller
{
    public function __construct(
        protected ExecutiveService $executives,
        protected QRService $qrService
    ) {}

    /**
     * QR asset for an executive short link. The QR encodes the public /r/CODE
     * link; click tracking is added in the next Growth Network item.
     */
    public function qr(string $code): Response
    {
        $referral = $this->executives->findByCode($code);

        if (!$referral) {
            abort(404);
        }

        return response($this->qrService->generate($this->executives->link($referral->code)), 200)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=86400');
    }
}
