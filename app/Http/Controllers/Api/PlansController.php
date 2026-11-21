<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Billing\PlanCatalog;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlansController extends Controller
{
    public function __construct(
        protected PlanCatalog $catalog,
        protected SubscriptionService $subscriptions
    ) {}

    /**
     * Public plan catalogue used by the pricing page and the onboarding plan
     * picker. Prices always come from the database, never from the client.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');

        $plans = $this->catalog->publicPlans()->map(function ($plan) use ($user) {
            $payload = $plan->toApiArray() + [
                'schedule' => $this->catalog->schedule($plan),
                'highlight' => $plan->code === \App\Models\Plan::ANNUAL,
            ];

            if ($user) {
                $quote = $this->catalog->quote($user, $plan->code);
                unset($quote['plan']);
                $payload['quote'] = $quote;
            }

            return $payload;
        })->values();

        return response()->json([
            'plans' => $plans,
            'currency' => config('roicard.billing.currency', 'GHS'),
            'annual_savings' => $this->annualSavings(),
            'membership' => $user ? $this->subscriptions->summary($user) : null,
        ]);
    }

    /**
     * Headline saving of the annual plan versus paying monthly for a year.
     */
    protected function annualSavings(): ?array
    {
        $annual = $this->catalog->find(\App\Models\Plan::ANNUAL);
        $monthly = $this->catalog->find(\App\Models\Plan::MONTHLY);

        $monthlyYearOne = (float) $monthly->initial_price + (11 * (float) $monthly->price);
        $annualYearOne = (float) $annual->initial_price;
        $annualYearTwo = (float) $annual->price;
        $monthlyYearTwo = 12 * (float) $monthly->price;

        if ($monthlyYearOne <= 0) {
            return null;
        }

        return [
            'year_one_amount' => round(max(0, $monthlyYearOne - $annualYearOne), 2),
            'year_one_percent' => round(max(0, ($monthlyYearOne - $annualYearOne) / $monthlyYearOne) * 100, 1),
            'year_two_amount' => round(max(0, $monthlyYearTwo - $annualYearTwo), 2),
            'year_two_percent' => round(max(0, ($monthlyYearTwo - $annualYearTwo) / $monthlyYearTwo) * 100, 1),
        ];
    }
}
