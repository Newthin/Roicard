/**
 * Friendly, user-facing copy for OAuth callback error codes.
 *
 * The server always redirects back to the frontend with a short error code
 * instead of a raw 500, so the callback screens can explain what happened and
 * offer a next step.
 */
export function signupErrorMessage(
  errorCode: string,
  providerLabel = "Sign-in"
): string {
  switch (errorCode) {
    case "account_deactivated":
      return "This account has been deactivated. Contact support to reactivate it.";
    case "account_deleted":
      return "This email is linked to a closed account. Sign up with a different email or contact support.";
    case "google_signup_failed":
    case "social_signup_failed":
      return "We couldn't finish creating your account. Please try again. If it keeps happening, contact support.";
    case "google_auth_failed":
    case "social_auth_failed":
      return `${providerLabel} sign-in could not be completed. Please try again.`;
    case "provider_not_configured":
      return "This sign-in option isn't set up yet. Please use email or Google.";
    case "unsupported_provider":
      return "This sign-in option isn't supported. Please use email or Google.";
    default:
      return `${providerLabel} sign-in could not be completed. Please try again.`;
  }
}
