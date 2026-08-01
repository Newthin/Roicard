import apiClient from "./client";

export async function getInterestOptions(): Promise<string[]> {
  const { data } = await apiClient.get("/interests");
  return Array.isArray(data?.interests) ? (data.interests as string[]) : [];
}
