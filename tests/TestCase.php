<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // UserObserver assigns a Spatie role on every user creation, so the
        // role rows must exist for any test that builds users. Seeding them
        // here (after RefreshDatabase has migrated) keeps every test
        // deterministic instead of depending on per-class setup.
        if (\Illuminate\Support\Facades\Schema::hasTable('roles')) {
            Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
            Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        }
    }

    /**
     * POST with a fresh idempotency key. The public booking route requires the
     * header in production, so tests should exercise the same contract without
     * accidentally replaying a previous response in the same test.
     */
    protected function postJsonWithIdempotency(string $uri, array $data = [])
    {
        return $this->withHeader('Idempotency-Key', Str::uuid()->toString())
            ->postJson($uri, $data);
    }
}
