<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Profile extends Model implements HasMedia
{
    use InteractsWithMedia;

    protected $fillable = [
        'user_id',
        'title',
        'organisation',
        'whatsapp_phone',
        'phone',
        'date_of_birth',
        'gender',
        'interests',
        'location',
        'bio',
        'seeking',
        'offering',
        'slug',
        'is_live',
        'completion_pct',
    ];

    protected $appends = ['avatar_url'];

    protected function casts(): array
    {
        return [
            'is_live' => 'boolean',
            'completion_pct' => 'integer',
            'date_of_birth' => 'date',
            'interests' => 'array',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->getFirstMediaUrl('avatar') ?: null;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function education()
    {
        return $this->hasMany(EducationEntry::class);
    }

    public function experience()
    {
        return $this->hasMany(ExperienceEntry::class);
    }

    public function achievements()
    {
        return $this->hasMany(AchievementEntry::class);
    }

    public function socialLinks()
    {
        return $this->hasMany(SocialLink::class);
    }

    public function interestOptions()
    {
        return $this->belongsToMany(InterestOption::class, 'profile_interest');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('avatar')->singleFile();
        $this->addMediaCollection('cv');
    }

    public function recalculateCompletion(): void
    {
        $score = 0;
        $total = 10;

        if ($this->title) $score++;
        if ($this->organisation) $score++;
        if ($this->whatsapp_phone) $score++;
        if ($this->location) $score++;
        if ($this->bio) $score++;
        if ($this->education()->count() > 0) $score++;
        if ($this->experience()->count() > 0) $score++;
        if ($this->achievements()->count() > 0) $score++;
        if ($this->socialLinks()->count() > 0) $score++;
        if ($this->getMedia('cv')->count() > 0 || $this->getMedia('avatar')->count() > 0) $score++;

        $this->completion_pct = (int) round(($score / $total) * 100);
        $this->saveQuietly();
    }
}
