import { apiClient, unwrapResults } from "./client";
import { Booking } from "../types";

export interface CreateBookingPayload {
  category_id?: string;
  category_name?: string;
  problem_description: string;
  address_text: string;
  latitude?: number;
  longitude?: number;
  booking_type?: "INSTANT" | "SCHEDULED";
  scheduled_time?: string;
}

export const bookingsApi = {
  createBooking: async (payload: CreateBookingPayload): Promise<Booking> => {
    const { data } = await apiClient.post("/bookings/", payload);
    return data;
  },

  getMyBookings: async (): Promise<Booking[]> => {
    const { data } = await apiClient.get("/bookings/my-bookings/");
    return unwrapResults<Booking>(data);
  },

  getBookingDetail: async (id: string): Promise<Booking> => {
    const { data } = await apiClient.get(`/bookings/${id}/`);
    return data;
  },

  cancelBooking: async (id: string, reason: string): Promise<any> => {
    const { data } = await apiClient.post(`/bookings/${id}/cancel/`, { reason });
    return data;
  },

  resendStartOtp: async (id: string): Promise<any> => {
    const { data } = await apiClient.post(`/bookings/${id}/resend-otp/`);
    return data;
  },
};

