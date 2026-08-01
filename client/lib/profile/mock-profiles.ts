/**
 * Seed mock profiles for public demo URLs.
 *
 * Used when a username is not found in localStorage (onboarding storage).
 * Enables /alex-morgan and similar routes to work before onboarding.
 */

import type { UserProfile } from "@/lib/profile/types";

/** Seed profiles omit the newer onboarding fields; defaults are applied on read. */
type SeedProfile = Omit<
  UserProfile,
  "membershipStatus" | "dateOfBirth" | "gender" | "interests" | "seeking" | "offering"
>;

const MOCK_PROFILES: Record<string, SeedProfile> = {
  "alex-morgan": {
    firstName: "Alex",
    lastName: "Morgan",
    username: "alex-morgan",
    profilePhotoUrl: null,
    professionalTitle: "Product Designer",
    organization: "Acme Inc.",
    bio: "Designing products that connect people and create meaningful professional opportunities. Passionate about UX, networking, and building the future of digital identity.",
    email: "alex@acme.com",
    phone: "+1 (555) 234-5678",
    whatsapp: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    social: {
      linkedin: "https://linkedin.com/in/alexmorgan",
      instagram: "https://instagram.com/alexmorgan",
      twitter: "https://x.com/alexmorgan",
      facebook: "https://facebook.com/alexmorgan",
      tiktok: "https://tiktok.com/@alexmorgan",
      snapchat: "",
      website: "https://alexmorgan.com",
    },
    createdAt: "2025-01-15T10:00:00.000Z",
  },
  "sarah-johnson": {
    firstName: "Sarah",
    lastName: "Johnson",
    username: "sarah-johnson",
    profilePhotoUrl: null,
    professionalTitle: "VP of Partnerships",
    organization: "Nexus Ventures",
    bio: "Connecting founders, investors, and operators. Passionate about building networks that create real business opportunities and lasting professional relationships.",
    email: "sarah@nexusventures.com",
    phone: "+1 (555) 876-5432",
    whatsapp: "+1 (555) 876-5432",
    location: "New York, NY",
    social: {
      linkedin: "https://linkedin.com/in/sarahjohnson",
      instagram: "",
      twitter: "https://x.com/sarahjohnson",
      facebook: "",
      tiktok: "",
      snapchat: "",
      website: "https://nexusventures.com",
    },
    createdAt: "2025-02-01T14:30:00.000Z",
  },
  "john-doe": {
    firstName: "John",
    lastName: "Doe",
    username: "john-doe",
    profilePhotoUrl: null,
    professionalTitle: "Software Engineer",
    organization: "TechFlow",
    bio: "Full-stack engineer building scalable platforms. Open to collaborations, speaking opportunities, and connecting with fellow builders in the tech ecosystem.",
    email: "john@techflow.io",
    phone: "+1 (555) 111-2233",
    whatsapp: "",
    location: "Austin, TX",
    social: {
      linkedin: "https://linkedin.com/in/johndoe",
      instagram: "",
      twitter: "https://x.com/johndoe",
      facebook: "",
      tiktok: "",
      snapchat: "",
      website: "https://johndoe.dev",
    },
    createdAt: "2025-03-10T09:00:00.000Z",
  },
  "peleg-darkey": {
    firstName: "Peleg",
    lastName: "Darkey",
    username: "peleg-darkey",
    profilePhotoUrl: null,
    professionalTitle: "Founder & CEO",
    organization: "ROICARD",
    bio: "Building the professional identity network of the future. Empowering professionals to share one link, connect instantly, and grow meaningful opportunities.",
    email: "peleg@roicard.com",
    phone: "+972 50-000-0000",
    whatsapp: "+972 50-000-0000",
    location: "Tel Aviv, Israel",
    social: {
      linkedin: "https://linkedin.com/in/pelegdarkey",
      instagram: "https://instagram.com/pelegdarkey",
      twitter: "https://x.com/pelegdarkey",
      facebook: "",
      tiktok: "",
      snapchat: "",
      website: "https://roicard.com",
    },
    createdAt: "2025-01-01T00:00:00.000Z",
  },
};

/**
 * Returns a seed mock profile for demo usernames.
 * Onboarding-saved profiles in localStorage take priority via storage layer.
 * Demo profiles are treated as activated members with empty community fields.
 */
export function getMockProfileByUsername(username: string): UserProfile | null {
  const seed = MOCK_PROFILES[username.toLowerCase()];
  if (!seed) return null;

  return {
    ...seed,
    membershipStatus: "active",
    dateOfBirth: "",
    gender: "",
    interests: [],
    seeking: "",
    offering: "",
  };
}
