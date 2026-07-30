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
    bio: data.bio,
    location: data.city,
    title: data.professionalTitle,
    organisation: data.organization,
    whatsapp_phone: data.whatsapp,
    social_links: data.socialLinks,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const { data: result } = await apiClient.put("/profile", payload);
  return result;
}
