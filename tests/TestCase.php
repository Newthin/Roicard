<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
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
}
