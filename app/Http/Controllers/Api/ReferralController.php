<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Growth\ExecutiveService;
use App\Services\Growth\ReferralAttributionService;
use App\Services\QRService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReferralController extends Controller
{
    public function __construct(
        protected ExecutiveService $executives,
        protected ReferralAttributionService $attribution,
        protected QRService $qrService
    ) {}

    /**
     * Record a short-link visit and set the last-click cookie. Called by the
     * frontend /r/CODE route before it redirects to registration.
     */
    public function click(string $code, Request $request): Response
    {
        $referral = $this->executives->findByCode($code);

        if (!$referral) {
            abort(404);
        }

        $this->attribution->recordClick($referral, $request);

        return response('', 204)->withCookie(
            $this->attribution->issueCookie($referral->code)
        );
    }

    /**
     * QR asset for an executive short link. The QR encodes the public /r/CODE
     * link that records a click before redirecting to registration.
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
