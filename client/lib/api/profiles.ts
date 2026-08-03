import apiClient from "./client";

export interface OnboardingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  city: string;
  professionalTitle: string;
  organization: string;
  whatsapp: string;
  dateOfBirth: string;
  gender: "" | "male" | "female" | "prefer_not_to_say";
  avatar: string | null;
  socialLinks: string;
  interests: string;
  seeking: string;
  offering: string;
}

export async function updateProfile(data: Partial<OnboardingData>) {
  const payload: Record<string, unknown> = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    bio: data.bio,
    location: data.city,
    title: data.professionalTitle,
    organisation: data.organization,
    whatsapp_phone: data.whatsapp,
    date_of_birth: data.dateOfBirth,
    gender: data.gender,
    interests: data.interests,
    social_links: data.socialLinks,
    seeking: data.seeking,
    offering: data.offering,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const { data: result } = await apiClient.put("/profile", payload);
  return result;
}
