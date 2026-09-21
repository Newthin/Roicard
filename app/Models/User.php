<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

use App\Models\SocialAccount;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'google_id',
        'password',
        'status',
        'role',
        'timezone',
        'email_verified_at',
        'email_verification_code',
        'email_verification_code_expires_at',
        'onboarding_completed_at',
        'campaign_code',
        'discount_campaign_id',
        'two_factor_secret',
        'two_factor_enabled',
        'deactivated_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'email_verification_code',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'email_verification_code_expires_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'deactivated_at' => 'datetime',
            'deleted_at' => 'datetime',
            'two_factor_enabled' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /**
     * Generate a 6-digit email verification code with a 30-minute expiry.
     */
    public function generateEmailVerificationCode(): string
    {
        $code = str_pad((string) mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        $this->update([
            'email_verification_code' => $code,
            'email_verification_code_expires_at' => now()->addMinutes(30),
        ]);

        return $code;
    }

    /**
     * Check if the given code matches and hasn't expired.
     */
    public function validateEmailVerificationCode(string $code): bool
    {
        if (
            $this->email_verification_code === null ||
            $this->email_verification_code_expires_at === null
        ) {
            return false;
        }

        if (now()->greaterThan($this->email_verification_code_expires_at)) {
            return false;
        }

        return hash_equals($this->email_verification_code, $code);
    }

    /**
     * Clear the verification code after successful use.
     */
    public function clearEmailVerificationCode(): void
    {
        $this->update([
            'email_verification_code' => null,
            'email_verification_code_expires_at' => null,
        ]);
    }

    public function profile()
    {
        return $this->hasOne(Profile::class);
    }

    public function discountCampaign()
    {
        return $this->belongsTo(DiscountCampaign::class, 'discount_campaign_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function smartCard()
    {
        return $this->hasOne(SmartCard::class);
    }

    public function connections()
    {
        return $this->hasMany(Connection::class, 'member_id');
    }

    public function analyticsEvents()
    {
        return $this->hasMany(AnalyticsEvent::class, 'member_id');
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class);
    }

    public function meetingTypes(): HasMany
    {
        return $this->hasMany(MeetingType::class);
    }

    public function hostedBookings(): HasMany
    {
        return $this->hasMany(MeetingBooking::class, 'host_user_id');
    }

    public function blockedDates(): HasMany
    {
        return $this->hasMany(MeetingBlockedDate::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function sendEmailVerificationNotification(): void
    {
        $code = $this->generateEmailVerificationCode();
        $this->notify(new \App\Notifications\VerifyEmail($code));
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * When this draft account will be closed by drafts:expiration-reminders,
     * or null for non-draft accounts. The command closes cohorts whose
     * created_at date is 8 days back, i.e. at/after midnight following the
     * 7-day activation window — matching the "after midnight" email copy.
     */
    public function draftClosesAt(): ?\Carbon\CarbonInterface
    {
        if ($this->status !== 'draft' || !$this->created_at) {
            return null;
        }

        return $this->created_at->startOfDay()->addDays(8);
    }

    public function isDeactivated(): bool
    {
        return $this->deactivated_at !== null;
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
