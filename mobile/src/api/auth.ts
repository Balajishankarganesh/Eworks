import { apiClient } from "./client";
import { User, AuthTokens } from "../types";

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  message?: string;
}

export interface SendOtpResponse {
  message: string;
  phone: string;
  expires_in_seconds: number;
  provider?: string;
  otp?: string;
  master_otp?: string;
  dev_hint?: string;
}

export interface VerifyOtpResponse {
  message: string;
  is_new_user: boolean;
  user: User;
  tokens: AuthTokens;
}

export const authApi = {
  loginWithPassword: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post("/auth/login/", { email, password });
    return {
      user: data.user,
      tokens: data.tokens || { access: data.access, refresh: data.refresh },
      message: data.message,
    };
  },

  sendPhoneOtp: async (phone: string): Promise<SendOtpResponse> => {
    const { data } = await apiClient.post("/auth/phone/send-otp/", { phone });
    return data;
  },

  verifyPhoneOtp: async (
    phone: string,
    otp: string,
    role: "CUSTOMER" | "PARTNER" = "CUSTOMER"
  ): Promise<VerifyOtpResponse> => {
    const { data } = await apiClient.post("/auth/phone/verify-otp/", { phone, otp, role });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get("/auth/me/");
    return data;
  },
};

