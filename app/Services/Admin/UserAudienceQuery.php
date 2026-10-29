<?php

namespace App\Services\Admin;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * The single source of member-filtering logic for the admin console.
 *
 * Both AdminController::users() and the Send Message recipient picker build
 * their queries here, so a new filter (onboarding, date range, campaign,
 * partial search) only has to be added once.
 */
class UserAudienceQuery
{
    public const ALLOWED_FILTERS = [
        'status',
        'role',
        'first_name',
        'last_name',
        'email',
        'campaign_code',
    ];

    public const ALLOWED_SORTS = [
        'created_at',
        'first_name',
        'last_name',
        'email',
    ];

    /**
     * Filters accepted either as filter[key]=… (existing admin table) or as
     * a flat top-level key (the recipient picker).
     */
    private const FLAT_KEYS = [
        'status',
        'role',
        'first_name',
        'last_name',
        'email',
        'campaign_code',
        'search',
        'onboarding_completed',
        'email_verified',
        'created_from',
        'created_to',
        'has_campaign_code',
        'include_admins',
        'sort',
    ];

    public function fromRequest(
        Request $request,
        bool $excludeAdmins = false,
        ?string $defaultSort = null,
    ): QueryBuilder {
        $filters = $request->input('filter', []);
        $filters = is_array($filters) ? $filters : [];

        foreach (self::FLAT_KEYS as $key) {
            if ($request->has($key)) {
                $filters[$key] = $request->input($key);
            }
        }

        $filters['include_user_ids'] = array_merge(
            $this->intList($filters['include_user_ids'] ?? []),
            $this->intList($request->input('include_user_ids', [])),
        );
        $filters['exclude_user_ids'] = array_merge(
            $this->intList($filters['exclude_user_ids'] ?? []),
            $this->intList($request->input('exclude_user_ids', [])),
        );

        return $this->build($filters, $excludeAdmins, $defaultSort);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function build(
        array $filters,
        bool $excludeAdmins = false,
        ?string $defaultSort = null,
    ): QueryBuilder {
        $query = QueryBuilder::for(User::class)
            ->allowedFilters(self::ALLOWED_FILTERS)
            ->allowedSorts(self::ALLOWED_SORTS)
            ->with('profile');

        $includeAdmins = $this->bool($filters['include_admins'] ?? false);
        if ($excludeAdmins && ! $includeAdmins) {
            $query->where('role', '!=', 'admin');
        }

        $status = $filters['status'] ?? null;
        if (in_array($status, ['draft', 'active'], true)) {
            $query->where('status', $status);
        }

        $role = $filters['role'] ?? null;
        if (in_array($role, ['member', 'admin'], true)) {
            $query->where('role', $role);
        }

        foreach (['first_name', 'last_name', 'email', 'campaign_code'] as $column) {
            $value = $filters[$column] ?? null;
            if (is_string($value) && trim($value) !== '') {
                $query->where($column, trim($value));
            }
        }

        $search = $filters['search'] ?? null;
        if (is_string($search) && trim($search) !== '') {
            $like = '%' . addcslashes(trim($search), '%_\\') . '%';
            $concat = DB::connection()->getDriverName() === 'sqlite'
                ? "first_name || ' ' || last_name"
                : "CONCAT(first_name, ' ', last_name)";

            $query->where(function ($builder) use ($like, $concat) {
                $builder->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhereRaw("{$concat} like ?", [$like]);
            });
        }

        if (array_key_exists('onboarding_completed', $filters)) {
            $this->bool($filters['onboarding_completed'])
                ? $query->whereNotNull('onboarding_completed_at')
                : $query->whereNull('onboarding_completed_at');
        }

        if (array_key_exists('email_verified', $filters)) {
            $this->bool($filters['email_verified'])
                ? $query->whereNotNull('email_verified_at')
                : $query->whereNull('email_verified_at');
        }

        if (array_key_exists('has_campaign_code', $filters)) {
            $this->bool($filters['has_campaign_code'])
                ? $query->whereNotNull('campaign_code')->where('campaign_code', '!=', '')
                : $query->where(fn ($builder) => $builder->whereNull('campaign_code')->orWhere('campaign_code', ''));
        }

        $from = $this->date($filters['created_from'] ?? null);
        if ($from) {
            $query->whereDate('created_at', '>=', $from);
        }

        $to = $this->date($filters['created_to'] ?? null);
        if ($to) {
            $query->whereDate('created_at', '<=', $to);
        }

        $includeIds = $this->intList($filters['include_user_ids'] ?? []);
        if ($includeIds !== []) {
            $query->whereIn('id', $includeIds);
        }

        $excludeIds = $this->intList($filters['exclude_user_ids'] ?? []);
        if ($excludeIds !== []) {
            $query->whereNotIn('id', $excludeIds);
        }

        $sort = $filters['sort'] ?? null;
        if (is_string($sort) && $sort !== '') {
            $descending = str_starts_with($sort, '-');
            $column = ltrim($sort, '-');
            if (in_array($column, self::ALLOWED_SORTS, true)) {
                $query->orderBy($column, $descending ? 'desc' : 'asc');
            }
        } elseif ($defaultSort !== null) {
            $descending = str_starts_with($defaultSort, '-');
            $column = ltrim($defaultSort, '-');
            if (in_array($column, self::ALLOWED_SORTS, true)) {
                $query->orderBy($column, $descending ? 'desc' : 'asc');
            }
        }

        return $query;
    }

    /**
     * Whole days left before a draft closes, matching User::draftClosesAt().
     */
    public function draftDaysRemaining(User $user): ?int
    {
        $closes = $user->draftClosesAt();

        if ($closes === null) {
            return null;
        }

        if ($closes->isPast()) {
            return 0;
        }

        return max(0, (int) ceil(now()->diffInHours($closes, false) / 24));
    }

    /**
     * @return array<int, int>
     */
    private function intList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(
            array_map('intval', $value),
            fn (int $id) => $id > 0,
        )));
    }

    private function bool(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function date(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
