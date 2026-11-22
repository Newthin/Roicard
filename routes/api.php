<?php

use App\Http\Controllers\Api\AdminBillingController;
use App\Http\Controllers\Api\AdminCommissionController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminExecutiveController;
use App\Http\Controllers\Api\AdminMessageController;
use App\Http\Controllers\Api\AdminPayoutController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\ConnectionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DiscountCampaignController;
use App\Http\Controllers\Api\ExecutiveController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\InterestOptionController;
use App\Http\Controllers\Api\MemberReferralController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PlansController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProfileEnrichmentController;
use App\Http\Controllers\Api\PublicProfileController;
use App\Http\Controllers\Api\QRController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\SmartCardController;
use App\Http\Controllers\Api\SocialAuthController;
use Illuminate\Support\Facades\Route;

// Global baseline throttle for all API traffic
Route::middleware('throttle:api')->group(function () {

/*
|--------------------------------------------------------------------------
| Public Routes (no auth)
|--------------------------------------------------------------------------
*/
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
Route::get('/auth/social/{provider}/redirect', [SocialAuthController::class, 'redirect']);
Route::get('/auth/social/{provider}/callback', [SocialAuthController::class, 'callback']);
Route::get('/auth/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
Route::post('/auth/email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:forgot-password');
Route::post('/auth/verify-email/code', [AuthController::class, 'verifyEmailCode']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:forgot-password');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/reactivate', [AuthController::class, 'reactivate']);

// Interest options (public)
Route::get('/interests', [InterestOptionController::class, 'index'])->middleware('cache.get');

// Public profile
Route::get('/public/{slug}', [PublicProfileController::class, 'show'])->middleware('cache.get');
Route::get('/public-sitemap', [PublicProfileController::class, 'sitemap']);
Route::post('/public/{slug}/event', [PublicProfileController::class, 'trackEvent']);

// Connection request (public, no auth)
Route::post('/connections', [ConnectionController::class, 'store']);

// Public meeting booking flow (no auth, rate-limited)
Route::get('/public/{slug}/meeting-types', [\App\Http\Controllers\Api\PublicBookingController::class, 'meetingTypes'])->middleware('throttle:public-booking');
Route::get('/public/{slug}/meeting-types/{meetingType}/slots', [\App\Http\Controllers\Api\PublicBookingController::class, 'slots'])->middleware('throttle:public-booking');
Route::post('/public/{slug}/meeting-types/{meetingType}/book', [\App\Http\Controllers\Api\PublicBookingController::class, 'book'])->middleware('idempotency');

// Public booking cancellation (guest uses token, rate-limited to prevent brute-force)
Route::post('/meetings/cancel/{token}', [\App\Http\Controllers\Api\MeetingBookingController::class, 'cancelByToken'])->middleware('throttle:guest-cancellation');

// QR code (public)
// /qr/image/{slug} serves the SVG for display; /qr/{slug} is the scan entry
// point that records a qr_scan and redirects to the profile. The scan route
// must NOT be cached, or repeated scans would be served from cache and never
// recorded.
Route::get('/qr/image/{slug}', [QRController::class, 'image'])->middleware('cache.get');
Route::get('/qr/{slug}', [QRController::class, 'show']);

// Executive referral assets (public — the short link is served by the frontend)
Route::get('/referrals/{code}/qr', [ReferralController::class, 'qr'])->middleware('cache.get');
Route::post('/referrals/{code}/click', [ReferralController::class, 'click']);

// Payment webhook (no auth, signature-verified)
Route::post('/payments/webhook/{provider}', [PaymentController::class, 'webhook']);

// Active discount campaigns (public — used by register form)
Route::get('/discount-campaigns/active', [DiscountCampaignController::class, 'active']);

// Public pricing catalogue (prices are always server-driven). Not cached:
// the response includes per-member quotes when a token is present.
Route::get('/plans', [PlansController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'prevent_leak'])->group(function () {
    // Current authenticated user (used to validate the cached session on boot)
    Route::get('/me', [AuthController::class, 'me']);

    // Account & security
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/two-factor/verify', [AuthController::class, 'verifyTwoFactor']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::put('/auth/account', [AuthController::class, 'updateAccount']);
    Route::get('/auth/two-factor/status', [AuthController::class, 'twoFactorStatus']);
    Route::post('/auth/two-factor/setup', [AuthController::class, 'twoFactorSetup']);
    Route::post('/auth/two-factor/confirm', [AuthController::class, 'twoFactorConfirm']);
    Route::post('/auth/two-factor/disable', [AuthController::class, 'twoFactorDisable']);
    Route::post('/auth/deactivate', [AuthController::class, 'deactivate']);
    Route::delete('/auth/account', [AuthController::class, 'deleteAccount']);

    // Profile
    Route::post('/profile', [ProfileController::class, 'store']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/complete', [ProfileController::class, 'complete']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);

    // Profile Enrichment (Screens 12-14)
    Route::post('/profile/cv', [ProfileEnrichmentController::class, 'uploadCv']);
    Route::delete('/profile/cv/{media}', [ProfileEnrichmentController::class, 'deleteCv'])->middleware('owns');
    Route::post('/profile/education', [ProfileEnrichmentController::class, 'storeEducation']);
    Route::patch('/profile/education/{education}', [ProfileEnrichmentController::class, 'updateEducation'])->middleware('owns');
    Route::delete('/profile/education/{education}', [ProfileEnrichmentController::class, 'destroyEducation'])->middleware('owns');
    Route::post('/profile/experience', [ProfileEnrichmentController::class, 'storeExperience']);
    Route::patch('/profile/experience/{experience}', [ProfileEnrichmentController::class, 'updateExperience'])->middleware('owns');
    Route::delete('/profile/experience/{experience}', [ProfileEnrichmentController::class, 'destroyExperience'])->middleware('owns');
    Route::post('/profile/achievements', [ProfileEnrichmentController::class, 'storeAchievement']);
    Route::patch('/profile/achievements/{achievement}', [ProfileEnrichmentController::class, 'updateAchievement'])->middleware('owns');
    Route::delete('/profile/achievements/{achievement}', [ProfileEnrichmentController::class, 'destroyAchievement'])->middleware('owns');
    Route::put('/profile/social-links', [ProfileEnrichmentController::class, 'updateSocialLinks']);

    // Payments
    Route::post('/payments/initiate', [PaymentController::class, 'initiate'])->middleware(['throttle:payment-initiate', 'idempotency']);
    Route::post('/payments/mock/confirm', [PaymentController::class, 'confirmMock'])->middleware('throttle:payment-initiate');
    Route::get('/payments/status/{reference}', [PaymentController::class, 'status']);

    // Billing / subscription management
    Route::get('/billing', [BillingController::class, 'summary']);
    Route::get('/billing/invoices', [BillingController::class, 'invoices']);
    Route::post('/billing/quote', [BillingController::class, 'quote']);
    Route::post('/billing/cancel', [BillingController::class, 'cancel']);
    Route::post('/billing/resume', [BillingController::class, 'resume']);

    // Smart Cards
    Route::post('/smart-cards/delivery', [SmartCardController::class, 'storeDelivery']);

    // Growth Network — executive referral assets and dashboard (plan-based identity)
    Route::get('/executive/referral', [ExecutiveController::class, 'referral']);
    Route::get('/executive/dashboard', [ExecutiveController::class, 'dashboard']);

    // Growth Network — verified member referrals (non-cash credit)
    Route::get('/referrals/me', [MemberReferralController::class, 'me']);
    Route::get('/referrals/dashboard', [MemberReferralController::class, 'dashboard']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Connections
    Route::get('/connections', [ConnectionController::class, 'index']);
    Route::patch('/connections/{id}', [ConnectionController::class, 'update']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);

    // Analytics
    Route::get('/analytics/summary', [AnalyticsController::class, 'summary']);
    Route::post('/analytics/events', [AnalyticsController::class, 'store']);

    // Meetings - Owner. Creating and managing meeting types, availability and
    // booking decisions is a paid feature. Viewing and cancelling bookings that
    // were created while the member was paid stays available so a downgrade
    // never strands an existing meeting.
    Route::get('/meeting-types', [\App\Http\Controllers\Api\MeetingTypeController::class, 'index'])->middleware('feature:meetings');
    Route::post('/meeting-types', [\App\Http\Controllers\Api\MeetingTypeController::class, 'store'])->middleware('feature:meetings');
    Route::get('/meeting-types/{meetingType}', [\App\Http\Controllers\Api\MeetingTypeController::class, 'show'])->middleware(['feature:meetings', 'owns']);
    Route::patch('/meeting-types/{meetingType}', [\App\Http\Controllers\Api\MeetingTypeController::class, 'update'])->middleware(['feature:meetings', 'owns']);
    Route::delete('/meeting-types/{meetingType}', [\App\Http\Controllers\Api\MeetingTypeController::class, 'destroy'])->middleware(['feature:meetings', 'owns']);
    Route::get('/meeting-types/{meetingType}/slots', [\App\Http\Controllers\Api\MeetingTypeController::class, 'slots'])->middleware(['feature:meetings', 'owns']);

    // Meetings - Bookings (owner). Read/cancel/ICS are intentionally ungated;
    // confirm, decline and reschedule require the paid entitlement.
    Route::get('/meetings', [\App\Http\Controllers\Api\MeetingBookingController::class, 'index']);
    Route::get('/meetings/{meetingBooking}', [\App\Http\Controllers\Api\MeetingBookingController::class, 'show'])->middleware('owns');
    Route::patch('/meetings/{meetingBooking}/confirm', [\App\Http\Controllers\Api\MeetingBookingController::class, 'confirm'])->middleware(['feature:meetings', 'owns']);
    Route::patch('/meetings/{meetingBooking}/decline', [\App\Http\Controllers\Api\MeetingBookingController::class, 'decline'])->middleware(['feature:meetings', 'owns']);
    Route::patch('/meetings/{meetingBooking}/cancel', [\App\Http\Controllers\Api\MeetingBookingController::class, 'cancel'])->middleware('owns');
    Route::post('/meetings/{meetingBooking}/reschedule', [\App\Http\Controllers\Api\MeetingBookingController::class, 'proposeReschedule'])->middleware(['feature:meetings', 'owns']);
    Route::patch('/meetings/{meetingBooking}/reschedule/{rescheduleRequest}/accept', [\App\Http\Controllers\Api\MeetingBookingController::class, 'acceptReschedule'])->middleware(['feature:meetings', 'owns']);
    Route::patch('/meetings/{meetingBooking}/reschedule/{rescheduleRequest}/decline', [\App\Http\Controllers\Api\MeetingBookingController::class, 'declineReschedule'])->middleware(['feature:meetings', 'owns']);
    Route::get('/meetings/{meetingBooking}/ics', [\App\Http\Controllers\Api\MeetingBookingController::class, 'downloadIcs'])->middleware('owns');

    // Meetings - Blocked dates (owner)
    Route::get('/blocked-dates', [\App\Http\Controllers\Api\MeetingBlockedDateController::class, 'index'])->middleware('feature:meetings');
    Route::post('/blocked-dates', [\App\Http\Controllers\Api\MeetingBlockedDateController::class, 'store'])->middleware('feature:meetings');
    Route::delete('/blocked-dates/{meetingBlockedDate}', [\App\Http\Controllers\Api\MeetingBlockedDateController::class, 'destroy'])->middleware(['feature:meetings', 'owns']);

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('is_admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/stats/trends', [AdminController::class, 'trends']);

        // Plans & subscriptions
        Route::get('/plans', [AdminBillingController::class, 'plans']);
        Route::patch('/plans/{code}', [AdminBillingController::class, 'updatePlan']);
        Route::get('/subscriptions', [AdminBillingController::class, 'subscriptions']);
        Route::post('/users/{id}/subscription', [AdminBillingController::class, 'grantSubscription']);
        Route::delete('/users/{id}/subscription', [AdminBillingController::class, 'revokeSubscription']);

        // Growth Network — executive referral directory
        Route::get('/executives', [AdminExecutiveController::class, 'index']);
        Route::get('/executives/{id}', [AdminExecutiveController::class, 'show'])->whereNumber('id');
        Route::get('/referral-clicks', [AdminExecutiveController::class, 'clicks']);
        Route::get('/commissions', [AdminCommissionController::class, 'index']);

        // Growth Network — payout settings, batches and finance approval
        Route::get('/payout/settings', [AdminPayoutController::class, 'settings']);
        Route::patch('/payout/settings', [AdminPayoutController::class, 'updateSettings']);
        Route::get('/payout/batches', [AdminPayoutController::class, 'batches']);
        Route::post('/payout/batches/generate', [AdminPayoutController::class, 'generate']);
        Route::get('/payout/batches/{batch}', [AdminPayoutController::class, 'batch'])->whereNumber('batch');
        Route::post('/payout/batches/{batch}/approve', [AdminPayoutController::class, 'approve'])->whereNumber('batch');
        Route::patch('/payout/batches/{batch}/items/{item}/transfer-reference', [AdminPayoutController::class, 'setTransferReference'])
            ->whereNumber(['batch', 'item']);
        Route::post('/payout/batches/{batch}/mark-paid', [AdminPayoutController::class, 'markPaid'])->whereNumber('batch');
        Route::get('/payout/batches/{batch}/csv', [AdminPayoutController::class, 'csv'])->whereNumber('batch');

        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{id}', [AdminController::class, 'showUser']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
        Route::patch('/users/{id}/profile', [AdminController::class, 'updateUserProfile']);
        Route::post('/users/{id}/password-reset', [AdminController::class, 'sendPasswordReset']);
        Route::post('/users/{id}/avatar', [AdminController::class, 'uploadUserAvatar']);
        Route::delete('/users/{id}/avatar', [AdminController::class, 'deleteUserAvatar']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::get('/smart-cards', [AdminController::class, 'smartCards']);
        Route::post('/smart-cards', [AdminController::class, 'registerCard']);
        Route::patch('/smart-cards/{id}/assign', [AdminController::class, 'assignCard']);
        Route::patch('/smart-cards/{id}/unassign', [AdminController::class, 'unassignCard']);
        Route::patch('/smart-cards/{id}/activate', [AdminController::class, 'activateCard']);
        Route::patch('/smart-cards/{id}/deactivate', [AdminController::class, 'deactivateCard']);
        Route::patch('/smart-cards/{id}/dispatch', [AdminController::class, 'dispatchCard']);
        Route::patch('/smart-cards/{id}/deliver', [AdminController::class, 'deliverCard']);
        Route::get('/connections', [AdminController::class, 'connections']);
        Route::get('/activity-log', [AdminController::class, 'activityLog']);
        Route::get('/meetings', [AdminController::class, 'meetings']);

        // Discount campaigns (member pricing)
        Route::get('/discount-campaigns', [DiscountCampaignController::class, 'index']);
        Route::post('/discount-campaigns', [DiscountCampaignController::class, 'store']);
        Route::patch('/discount-campaigns/{id}', [DiscountCampaignController::class, 'update']);

        // Manual member messages — admins only.
        Route::get('/messages/recipients', [AdminMessageController::class, 'recipients']);
        Route::get('/messages/quota', [AdminMessageController::class, 'quota']);
        Route::get('/messages/duplicate-check', [AdminMessageController::class, 'duplicateCheck']);
        Route::post('/messages/preview', [AdminMessageController::class, 'preview'])->middleware('throttle:admin-message-test');
        Route::post('/messages/test', [AdminMessageController::class, 'sendTest'])->middleware('throttle:admin-message-test');
        Route::post('/messages', [AdminMessageController::class, 'store'])
            ->middleware(['throttle:admin-message-send', 'idempotency']);
        Route::get('/messages', [AdminMessageController::class, 'index']);
        Route::get('/messages/{id}', [AdminMessageController::class, 'show']);
        Route::post('/messages/{id}/retry', [AdminMessageController::class, 'retry'])
            ->middleware(['throttle:admin-message-send', 'idempotency']);
    });
});

});
