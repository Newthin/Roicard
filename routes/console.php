<?php

use Illuminate\Support\Facades\Schedule;

// Permanently remove accounts whose data retention window has elapsed.
// Requires a `schedule:run` cron (see deploy/README.md).
Schedule::command('users:purge')->daily();
