<?php

namespace Tests\Feature;

use App\Mail\PaymentReceiptMail;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * A receipt confirms an actual charge. It is queued exactly once per applied
 * Payment, uses database amounts, and never exposes payment credentials or
 * the member's MoMo number.
 */
class PaymentReceiptMailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.payment_provider' => 'mock']);
    }

    protected function member(): User
    {
        $user = User::factory()->create([
            'status' => 'draft',
            'role' => 'member',
        ]);
        $user->profile()->create([]);

        return $user;
    }

    protected function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    protected function startCheckout(User $user, string $plan): Payment
    {
        $response = $this->withToken($this->token($user))
            ->withHeader('Idempotency-Key', 'key-' . uniqid())
            ->postJson('/api/payments/initiate', [
                'plan' => $plan,
                'method' => 'mobile_money',
                'momo_number' => '+233241234567',
                // Deliberately wrong: the receipt must use the server price.
                'amount' => 1,
            ]);
        $response->assertOk();

        return Payment::findOrFail($response->json('payment.id') ?? 0);
    }

    protected function confirmMock(User $user, Payment $payment): void
    {
        $this->withToken($this->token($user))
            ->postJson('/api/payments/mock/confirm', [
                'reference' => $payment->provider_reference,
            ])
            ->assertOk();
    }

    public function test_successful_checkout_sends_one_receipt_with_server_amount(): void
    {
        Mail::fake();

        $user = $this->member();
        $payment = $this->startCheckout($user, Plan::ANNUAL);
        $this->confirmMock($user, $payment);

        Mail::assertQueued(PaymentReceiptMail::class, 1);

        Mail::assertQueued(PaymentReceiptMail::class, function ($mail) use ($user, $payment) {
            $this->assertTrue($mail->user->is($user));
            $this->assertTrue($mail->payment->is($payment->fresh()));
            $this->assertSame('Your Roicard payment receipt', $mail->envelope()->subject);

            $html = $mail->render();
            $this->assertStringContainsString('GHS 350.00', $html);
            $this->assertStringContainsString($payment->provider_reference, $html);
            $this->assertStringContainsString('Mobile Money', $html);
            $this->assertStringContainsString('New membership', $html);
            $this->assertStringContainsString('Go to Billing', $html);
            // The client-supplied amount and the MoMo number must never appear.
            $this->assertStringNotContainsString('GHS 1.00', $html);
            $this->assertStringNotContainsString((string) $payment->momo_number, $html);

            return true;
        });
    }

    public function test_replayed_confirmation_does_not_send_a_second_receipt(): void
    {
        Mail::fake();

        $user = $this->member();
        $payment = $this->startCheckout($user, Plan::MONTHLY);
        $this->confirmMock($user, $payment);
        $this->confirmMock($user, $payment);

        Mail::assertQueued(PaymentReceiptMail::class, 1);
    }

    public function test_pending_payment_does_not_send_a_receipt(): void
    {
        Mail::fake();

        $user = $this->member();
        $this->startCheckout($user, Plan::ANNUAL);

        Mail::assertNotQueued(PaymentReceiptMail::class);
    }

    public function test_admin_grant_does_not_send_a_receipt(): void
    {
        Mail::fake();

        $user = $this->member();
        app(SubscriptionService::class)->grantPlan($user, Plan::ANNUAL);

        Mail::assertNotQueued(PaymentReceiptMail::class);
    }

    public function test_receipt_shows_referral_discount_and_membership_credit(): void
    {
        Mail::fake();

        $user = $this->member();
        $payment = $this->startCheckout($user, Plan::MONTHLY);
        $payment->forceFill([
            'status' => 'success',
            'referral_discount_amount' => 50,
            'referral_credit_applied' => 30,
        ])->save();

        $html = (new PaymentReceiptMail($user, $payment->fresh()))->render();

        $this->assertStringContainsString('Referral discount applied: GHS 50.00', $html);
        $this->assertStringContainsString('Membership credit applied: GHS 30.00', $html);
    }

    public function test_renewal_and_upgrade_purposes_are_labelled(): void
    {
        $user = $this->member();
        $payment = $this->startCheckout($user, Plan::ANNUAL);

        foreach ([Payment::PURPOSE_RENEWAL => 'Renewal', Payment::PURPOSE_UPGRADE => 'Plan upgrade'] as $purpose => $label) {
            $payment->forceFill(['purpose' => $purpose])->save();

            $html = (new PaymentReceiptMail($user, $payment->fresh()))->render();

            $this->assertStringContainsString($label, $html);
        }
    }
}
