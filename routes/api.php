<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConnectionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProfileEnrichmentController;
use App\Http\Controllers\Api\PublicProfileController;
use App\Http\Controllers\Api\QRController;
use App\Http\Controllers\Api\SmartCardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes (no auth)
|--------------------------------------------------------------------------
*/
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// Public profile
Route::get('/public/{slug}', [PublicProfileController::class, 'show']);
Route::post('/public/{slug}/event', [PublicProfileController::class, 'trackEvent']);

// Connection request (public, no auth)
Route::post('/connections', [ConnectionController::class, 'store']);

// QR code (public)
Route::get('/qr/{slug}', [QRController::class, 'show']);

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
    Route::get('/profile', [ProfileController::class, 'show']);

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
    Route::post('/payments/initiate', [PaymentController::class, 'initiate']);
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
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
        Route::patch('/smart-cards/{id}/dispatch', [AdminController::class, 'dispatchCard']);
        Route::patch('/smart-cards/{id}/deliver', [AdminController::class, 'deliverCard']);
    });
});
