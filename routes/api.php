<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConnectionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\InterestOptionController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProfileEnrichmentController;
use App\Http\Controllers\Api\PublicProfileController;
use App\Http\Controllers\Api\QRController;
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
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:forgot-password');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/reactivate', [AuthController::class, 'reactivate']);

// Interest options (public)
Route::get('/interests', [InterestOptionController::class, 'index'])->middleware('cache.get');

// Public profile
Route::get('/public/{slug}', [PublicProfileController::class, 'show'])->middleware('cache.get');
Route::post('/public/{slug}/event', [PublicProfileController::class, 'trackEvent']);

// Connection request (public, no auth)
Route::post('/connections', [ConnectionController::class, 'store']);

// QR code (public)
// /qr/image/{slug} serves the SVG for display; /qr/{slug} is the scan entry
// point that records a qr_scan and redirects to the profile. The scan route
// must NOT be cached, or repeated scans would be served from cache and never
// recorded.
Route::get('/qr/image/{slug}', [QRController::class, 'image'])->middleware('cache.get');
Route::get('/qr/{slug}', [QRController::class, 'show']);

// Payment webhook (no auth, signature-verified)
Route::post('/payments/webhook/{provider}', [PaymentController::class, 'webhook']);

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
    Route::get('/payments/status/{reference}', [PaymentController::class, 'status']);

    // Smart Cards
    Route::post('/smart-cards/delivery', [SmartCardController::class, 'storeDelivery']);

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

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('is_admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/stats/trends', [AdminController::class, 'trends']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
        Route::patch('/users/{id}/profile', [AdminController::class, 'updateUserProfile']);
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
    });
});

});
