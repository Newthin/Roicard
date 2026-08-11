import apiClient from "./client";

export interface LoginResponse {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    role: string;
    email_verified?: boolean;
  };
  token?: string;
  two_factor_required?: boolean;
  pending_token?: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    role: string;
    email_verified?: boolean;
  };
  requires_email_verification: boolean;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register", payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
  return data;
}

export interface MeResponse {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    role: string;
    email_verified?: boolean;
  };
}

export async function me(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/me");
  return data;
}

export async function verifyEmail(email: string): Promise<void> {
  await apiClient.post("/auth/email/resend", { email });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await apiClient.post("/auth/reset-password", payload);
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}): Promise<void> {
  await apiClient.post("/auth/change-password", payload);
}

export async function updateAccount(payload: {
  email?: string;
  username?: string;
}): Promise<{
  user: LoginResponse["user"];
  email_changed: boolean;
  message: string;
}> {
  const { data } = await apiClient.put("/auth/account", payload);
  return data;
}

export async function verifyTwoFactor(code: string): Promise<LoginResponse> {
  const { data } = await apiClient.post("/auth/two-factor/verify", { code });
  return data;
}

export interface TwoFactorStatus {
  enabled: boolean;
  has_pending_secret: boolean;
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const { data } = await apiClient.get("/auth/two-factor/status");
  return data;
}

export async function twoFactorSetup(
  current_password: string
): Promise<{ secret: string; otpauth_url: string }> {
  const { data } = await apiClient.post("/auth/two-factor/setup", {
    current_password,
  });
  return data;
}

export async function twoFactorConfirm(code: string): Promise<{
  enabled: boolean;
  message: string;
}> {
  const { data } = await apiClient.post("/auth/two-factor/confirm", { code });
  return data;
}

export async function twoFactorDisable(payload: {
  code?: string;
  current_password?: string;
}): Promise<{ enabled: boolean; message: string }> {
  const { data } = await apiClient.post("/auth/two-factor/disable", payload);
  return data;
}

export async function deactivateAccount(
  current_password: string
): Promise<void> {
  await apiClient.post("/auth/deactivate", { current_password });
}

export async function reactivateAccount(
  email: string,
  current_password: string
): Promise<void> {
  await apiClient.post("/auth/reactivate", { email, current_password });
}

export async function deleteAccount(current_password: string): Promise<void> {
  await apiClient.delete("/auth/account", {
    data: { current_password },
  });
}
