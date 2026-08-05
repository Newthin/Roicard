/**
 * User profile and onboarding type definitions.
 *
 * These types define the data shape collected during onboarding and stored
 * as the user's public ROICARD identity. Shared across onboarding, dashboard,
 * and the public /[username] profile route.
 */

/** Social link fields collected during onboarding (all optional). */
export type SocialLinks = {
  linkedin: string;
  instagram: string;
  twitter: string;
  facebook: string;
  tiktok: string;
  snapchat: string;
  website: string;
};

/** UI-only connection state for the public profile Connect button. */
export type ConnectionState = "none" | "pending" | "connected";

/** Guest connection request form payload (UI only until backend). */
export type ConnectionRequestData = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  /**
   * Where the two people met (event, NFC tap, coffee shop, mutual friend…).
   * Optional context that makes the connection easier to remember later.
   */
  meetingContext?: string;
};

/** Profile engagement stats shown on public profiles (mock until analytics API). */
export type ProfileStats = {
  profileViews: number;
  connectionRequests: number;
  totalConnections: number;
};

/**
 * Raw form data accumulated across all onboarding wizard steps.
 * Mirrors the step-by-step collection flow before profile finalization.
 */
export type OnboardingFormData = {
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  professionalTitle: string;
  roleDescription: string;
  organization: string;
  bio: string;
  email: string;
  phone: string;
  whatsapp: string;
  dateOfBirth: string;
  gender: "" | "male" | "female" | "prefer_not_to_say";
  location: string;
  social: SocialLinks;
  /** Areas the member is interested in (selected during onboarding). */
  interests: string[];
  /** What opportunities the member is seeking from the community. */
  seeking: string;
  /** Value, skills, or opportunities the member can offer others. */
  offering: string;
};

/** Membership activation status — payment is optional and can be done later. */
export type MembershipStatus = "pending" | "active";

/**
 * Completed user profile persisted after onboarding.
 * Includes generated username and metadata for public profile + QR code.
 */
export type UserProfile = OnboardingFormData & {
  username: string;
  createdAt: string;
  /** Whether the one-time membership fee has been activated. */
  membershipStatus: MembershipStatus;
};

/** Empty onboarding form used to initialize wizard state. */
export const EMPTY_ONBOARDING_DATA: OnboardingFormData = {
  firstName: "",
  lastName: "",
  profilePhotoUrl: null,
  professionalTitle: "",
  roleDescription: "",
  organization: "",
  bio: "",
  email: "",
  phone: "",
  whatsapp: "",
  dateOfBirth: "",
  gender: "",
  location: "",
  social: {
    linkedin: "",
    instagram: "",
    twitter: "",
    facebook: "",
    tiktok: "",
    snapchat: "",
    website: "",
  },
  interests: [],
  seeking: "",
  offering: "",
};

/** Public profile domain used for the profile URL preview during onboarding. */
export const PUBLIC_PROFILE_DOMAIN = "roicard.africa";

/** Gender options a member can select during onboarding. */
export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to mention" },
] as const;

/** Interest areas a member can select during onboarding. */
export const INTEREST_OPTIONS = [
  "Technology",
  "Entrepreneurship",
  "Leadership",
  "Networking",
  "Personal Branding",
  "Career Growth",
  "Business",
  "Creative Arts",
] as const;

/** Benefits included with ROICARD membership (shown before payment). */
export const MEMBERSHIP_BENEFITS = [
  "Professional Identity Profile",
  "Personalized Profile Link",
  "Smart Networking Features",
  "Community Access",
  "Opportunity Discovery",
  "Future Internship & Career Opportunities",
  "Roicard Smart Card",
] as const;

/** Supported (mock) payment methods for the membership activation fee. */
export const PAYMENT_METHODS = [
  { id: "mtn", label: "MTN Mobile Money" },
  { id: "telecel", label: "Telecel Cash" },
  { id: "airteltigo", label: "AirtelTigo Money" },
  { id: "card", label: "Visa / Mastercard" },
] as const;

/** One-time membership activation fee in Ghanaian Cedis. */
export const MEMBERSHIP_FEE_GHS = 350;

/** Metadata for each wizard step — drives stepper UI and navigation. */
export type OnboardingStepConfig = {
  id: number;
  title: string;
  description: string;
};

/** All onboarding steps in order (7 total: 6 data steps + review). */
export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: 1,
    title: "Identity",
    description: "Tell us who you are",
  },
  {
    id: 2,
    title: "Professional",
    description: "Your role and organization",
  },
  {
    id: 3,
    title: "Bio",
    description: "Share your story",
  },
  {
    id: 4,
    title: "Contact",
    description: "How people can reach you",
  },
  {
    id: 5,
    title: "Location",
    description: "Where you're based",
  },
  {
    id: 6,
    title: "Social",
    description: "Connect your online presence",
  },
  {
    id: 7,
    title: "Review",
    description: "Confirm and launch your card",
  },
];
