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
Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail'])->middleware('auth:sanctum');
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:forgot-password');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// Interest options (public)
Route::get('/interests', [InterestOptionController::class, 'index'])->middleware('cache.get');

// Public profile
Route::get('/public/{slug}', [PublicProfileController::class, 'show'])->middleware('cache.get');
Route::post('/public/{slug}/event', [PublicProfileController::class, 'trackEvent']);

// Connection request (public, no auth)
Route::post('/connections', [ConnectionController::class, 'store']);

// QR code (public)
Route::get('/qr/{slug}', [QRController::class, 'show'])->middleware('cache.get');

// Payment webhook (no auth, signature-verified)
Route::post('/payments/webhook/{provider}', [PaymentController::class, 'webhook']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Profile
    Route::post('/profile', [ProfileController::class, 'store']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::get('/profile', [ProfileController::class, 'show'])->middleware('cache.get');
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);

    // Profile Enrichment (Screens 12-14)
    Route::post('/profile/cv', [ProfileEnrichmentController::class, 'uploadCv']);
    Route::delete('/profile/cv/{id}', [ProfileEnrichmentController::class, 'deleteCv']);
    Route::post('/profile/education', [ProfileEnrichmentController::class, 'storeEducation']);
    Route::patch('/profile/education/{id}', [ProfileEnrichmentController::class, 'updateEducation']);
    Route::delete('/profile/education/{id}', [ProfileEnrichmentController::class, 'destroyEducation']);
    Route::post('/profile/experience', [ProfileEnrichmentController::class, 'storeExperience']);
    Route::patch('/profile/experience/{id}', [ProfileEnrichmentController::class, 'updateExperience']);
    Route::delete('/profile/experience/{id}', [ProfileEnrichmentController::class, 'destroyExperience']);
    Route::post('/profile/achievements', [ProfileEnrichmentController::class, 'storeAchievement']);
    Route::patch('/profile/achievements/{id}', [ProfileEnrichmentController::class, 'updateAchievement']);
    Route::delete('/profile/achievements/{id}', [ProfileEnrichmentController::class, 'destroyAchievement']);
    Route::put('/profile/social-links', [ProfileEnrichmentController::class, 'updateSocialLinks']);

    // Payments
    Route::post('/payments/initiate', [PaymentController::class, 'initiate'])->middleware(['throttle:payment-initiate', 'idempotency']);
    Route::get('/payments/status/{reference}', [PaymentController::class, 'status']);

    // Smart Cards
    Route::post('/smart-cards/delivery', [SmartCardController::class, 'storeDelivery']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('cache.get');

    // Connections
    Route::get('/connections', [ConnectionController::class, 'index'])->middleware('cache.get');
    Route::patch('/connections/{id}', [ConnectionController::class, 'update']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->middleware('cache.get');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);

    // Analytics
    Route::get('/analytics/summary', [AnalyticsController::class, 'summary'])->middleware('cache.get');
    Route::post('/analytics/events', [AnalyticsController::class, 'store']);

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('is_admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats'])->middleware('cache.get');
        Route::get('/stats/trends', [AdminController::class, 'trends'])->middleware('cache.get');
        Route::get('/users', [AdminController::class, 'users'])->middleware('cache.get');
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
        Route::get('/smart-cards', [AdminController::class, 'smartCards'])->middleware('cache.get');
        Route::patch('/smart-cards/{id}/assign', [AdminController::class, 'assignCard']);
        Route::patch('/smart-cards/{id}/unassign', [AdminController::class, 'unassignCard']);
        Route::patch('/smart-cards/{id}/dispatch', [AdminController::class, 'dispatchCard']);
        Route::patch('/smart-cards/{id}/deliver', [AdminController::class, 'deliverCard']);
        Route::get('/connections', [AdminController::class, 'connections'])->middleware('cache.get');
        Route::get('/activity-log', [AdminController::class, 'activityLog'])->middleware('cache.get');
    });
});

});
