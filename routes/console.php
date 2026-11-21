<?php

use Illuminate\Support\Facades\Schedule;

// Permanently remove accounts whose data retention window has elapsed.
// Requires a `schedule:run` cron (see deploy/README.md).
Schedule::command('users:purge')->daily();

// Draft expiration sequence — Day 3/6/7 reminders, Day 8 closure + card
// release. Requires a daily `schedule:run` cron; a missed day skips that
// cohort's step.
Schedule::command('drafts:expiration-reminders')->daily();

// Meeting reminders — dispatch reminders for bookings starting in 24h and 1h.
// Runs every 15 minutes; idempotent via cache dedup in SendMeetingReminderJob.
Schedule::command('meetings:reminders')->everyFifteenMinutes();

// Subscription lifecycle — ended periods enter grace immediately; expired
// grace windows downgrade the member to the free plan. Runs hourly so access
// changes within an hour of the boundary.
Schedule::command('billing:sync-lifecycle')->hourly();

// Renewal reminders at 14/7/3/1 days before the paid period ends. The command
// dedupes per subscription period, so daily execution is safe.
Schedule::command('billing:renewals')->dailyAt('08:00');

// Growth Network payouts — the service enforces the configured 14-day cadence
// from the last generation run, so a daily check stays truly biweekly and
// recovers cleanly from a missed day.
Schedule::command('payouts:generate-batches')->dailyAt('09:00');
