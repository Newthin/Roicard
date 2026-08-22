<?php

use Illuminate\Support\Facades\Schedule;

// Permanently remove accounts whose data retention window has elapsed.
// Requires a `schedule:run` cron (see deploy/README.md).
Schedule::command('users:purge')->daily();

// Draft expiration sequence — Day 3/6/7 reminders, Day 8 closure + card
// release. Requires a daily `schedule:run` cron; a missed day skips that
// cohort's step.
Schedule::command('drafts:expiration-reminders')->daily();
