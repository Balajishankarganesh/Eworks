import { apiClient, unwrapResults } from "./client";
import { Booking, PartnerOffer, PartnerProfile } from "../types";

export const partnerApi = {
  getProfile: async (): Promise<PartnerProfile> => {
    try {
      const { data } = await apiClient.get("/auth/me/partner-profile/");
      return data;
    } catch (e) {
      return {
        id: "demo-part-1",
        status: "APPROVED",
        is_online: true,
        average_rating: 4.88,
        total_reviews: 24,
        total_jobs_completed: 46,
      };
    }
  },

  toggleOnline: async (isOnline?: boolean): Promise<{ is_online: boolean; message: string }> => {
    const payload = typeof isOnline === "boolean" ? { is_online: isOnline } : {};
    const { data } = await apiClient.post("/auth/partner/toggle-online/", payload);
    return data;
  },

  getOffers: async (): Promise<PartnerOffer[]> => {
    try {
      const { data } = await apiClient.get("/bookings/partner/offers/");
      const items = unwrapResults<PartnerOffer>(data);
      if (items.length > 0) return items;
    } catch (e) {
      // Demo offer
    }

    return [
      {
        id: "off-demo-1",
        booking_id: "bk-991",
        category_name: "Electrician",
        problem_description: "Ceiling fan sparking & MCB trip in 2nd bedroom",
        customer_address: "Flat 4B, Green Meadows, Anna Nagar, Chennai",
        quoted_price: 349.0,
        partner_payout: 349.0, // 100% Free platform, 0% commission
        distance_km: 1.8,
      },
    ];
  },

  respondToOffer: async (offerId: string, action: "ACCEPT" | "REJECT"): Promise<any> => {
    const { data } = await apiClient.post(`/matching/offers/${offerId}/respond/`, { action });
    return data;
  },

  getAssignedJobs: async (): Promise<Booking[]> => {
    try {
      const { data } = await apiClient.get("/bookings/partner/jobs/");
      return unwrapResults<Booking>(data);
    } catch (e) {
      return [];
    }
  },

  startJob: async (bookingId: string, otp: string): Promise<any> => {
    const { data } = await apiClient.post(`/bookings/${bookingId}/start-job/`, { otp });
    return data;
  },

  completeJob: async (bookingId: string): Promise<any> => {
    const { data } = await apiClient.post(`/bookings/${bookingId}/complete/`, {});
    return data;
  },

  getEarnings: async (): Promise<any> => {
    try {
      const { data } = await apiClient.get("/payments/partner/earnings/");
      return data;
    } catch (e) {
      return {
        summary: {
          total_gross: 12450.0,
          total_net: 12450.0, // 100% Free: net equals gross
          platform_commission: 0.0,
          pending_payout: 0.0,
          completed_payout: 12450.0,
          total_jobs_completed: 34,
        },
      };
    }
  },
};
