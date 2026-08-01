import apiClient from "./client";

export interface Profile {
  id: number;
  user_id: number;
  title: string | null;
  organisation: string | null;
  whatsapp_phone: string | null;
  location: string | null;
  bio: string | null;
  slug: string | null;
  is_live: boolean;
  completion_pct: number;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: number;
  slug: string;
  title: string | null;
  organisation: string | null;
  whatsapp_phone: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "prefer_not_to_say" | null;
  interests: string[] | null;
  location: string | null;
  bio: string | null;
  avatar: string | null;
  user: { first_name: string; last_name: string; email: string };
  social_links: { platform: string; value: string }[];
  education: {
    id: number;
    institution: string;
    degree: string;
    start_year: number;
    end_year: number | null;
    honours: string | null;
  }[];
  experience: {
    id: number;
    title: string;
    company: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
  }[];
  achievements: {
    id: number;
    title: string;
    issuer: string | null;
    date: string | null;
  }[];
  cv: { url: string; name: string; size_kb: number } | null;
}

export async function getProfile(): Promise<{ profile: Profile }> {
  const { data } = await apiClient.get("/profile");
  return data;
}

export async function createProfile(payload: Partial<Profile>): Promise<{ profile: Profile }> {
  const { data } = await apiClient.post("/profile", payload);
  return data;
}

export async function updateProfile(payload: Partial<Profile>): Promise<{ profile: Profile }> {
  const { data } = await apiClient.put("/profile", payload);
  return data;
}

export async function getPublicProfile(slug: string, src?: string): Promise<PublicProfile> {
  const { data } = await apiClient.get(`/public/${slug}`, { params: { src } });
  return data;
}

export async function trackProfileEvent(slug: string, type: string): Promise<void> {
  await apiClient.post(`/public/${slug}/event`, { type });
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await apiClient.post("/profile/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}

export async function uploadCv(file: File): Promise<void> {
  const form = new FormData();
  form.append("cv", file);
  await apiClient.post("/profile/cv", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function deleteCv(id: number): Promise<void> {
  await apiClient.delete(`/profile/cv/${id}`);
}

export async function addEducation(payload: Record<string, unknown>): Promise<void> {
  await apiClient.post("/profile/education", payload);
}

export async function updateEducation(id: number, payload: Record<string, unknown>): Promise<void> {
  await apiClient.patch(`/profile/education/${id}`, payload);
}

export async function deleteEducation(id: number): Promise<void> {
  await apiClient.delete(`/profile/education/${id}`);
}

export async function addExperience(payload: Record<string, unknown>): Promise<void> {
  await apiClient.post("/profile/experience", payload);
}

export async function updateExperience(id: number, payload: Record<string, unknown>): Promise<void> {
  await apiClient.patch(`/profile/experience/${id}`, payload);
}

export async function deleteExperience(id: number): Promise<void> {
  await apiClient.delete(`/profile/experience/${id}`);
}

export async function addAchievement(payload: Record<string, unknown>): Promise<void> {
  await apiClient.post("/profile/achievements", payload);
}

export async function updateAchievement(id: number, payload: Record<string, unknown>): Promise<void> {
  await apiClient.patch(`/profile/achievements/${id}`, payload);
}

export async function deleteAchievement(id: number): Promise<void> {
  await apiClient.delete(`/profile/achievements/${id}`);
}

export async function updateSocialLinks(links: { platform: string; value: string }[]): Promise<void> {
  await apiClient.put("/profile/social-links", { links });
}
