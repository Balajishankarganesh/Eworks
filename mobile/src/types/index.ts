export type UserRole = "CUSTOMER" | "PARTNER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: UserRole;
  is_verified?: boolean;
  is_phone_verified?: boolean;
  avatar?: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number | string;
  icon?: string;
  image?: string;
  partner_count?: number;
}

export type BookingStatus =
  | "PENDING_MATCH"
  | "MATCHING"
  | "MATCHED"
  | "CONFIRMED"
  | "PARTNER_EN_ROUTE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED_CUSTOMER"
  | "CANCELLED_PARTNER"
  | "CANCELLED_ADMIN"
  | "NO_PARTNERS"
  | "FAILED";

export interface Booking {
  id: string;
  reference_id?: string;
  customer?: {
    id: string;
    first_name: string;
    phone: string;
  };
  partner?: {
    id: string;
    name: string;
    phone: string;
    rating?: number;
    avatar?: string | null;
  } | null;
  category?: {
    id: string;
    name: string;
  };
  category_name?: string;
  problem_description: string;
  address_text: string;
  status: BookingStatus;
  status_display?: string;
  scheduled_time?: string;
  estimated_price?: number;
  final_price?: number;
  job_start_otp?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface PartnerProfile {
  id: string | number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  is_online: boolean;
  average_rating: number | string;
  total_reviews: number;
  total_jobs_completed: number;
  bio?: string;
  years_of_experience?: number;
}

export interface PartnerOffer {
  id: string;
  booking_id: string;
  category_name: string;
  problem_description: string;
  customer_address: string;
  quoted_price: number;
  partner_payout: number;
  distance_km?: number;
  expires_at?: string;
}
