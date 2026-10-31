/**
 * Shared TypeScript types for the Home Services Marketplace.
 * These mirror the Django model shapes returned by the API.
 */

// ── Auth & Users ────────────────────────────────────────────────────────────

export type UserRole = "CUSTOMER" | "PARTNER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  is_verified: boolean;
  is_staff?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    is_verified: boolean;
  };
}

// ── Customer ─────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  user: User;
  default_address: string;
  default_latitude?: number;
  default_longitude?: number;
  total_bookings: number;
  created_at: string;
  updated_at: string;
}

// ── Partner ──────────────────────────────────────────────────────────────────

export type PartnerStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface PartnerProfile {
  user: User;
  status: PartnerStatus;
  status_display: string;
  bio: string;
  years_of_experience: number;
  is_online: boolean;
  service_radius_km: number;
  average_rating: number;
  total_reviews: number;
  total_jobs_completed: number;
  created_at: string;
  updated_at: string;
}

// ── Services ─────────────────────────────────────────────────────────────────

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  base_price: number;
  price_per_hour?: number;
  estimated_duration_minutes: number;
  is_active: boolean;
  display_order: number;
}

// ── Locations ────────────────────────────────────────────────────────────────

export interface ServiceAddress {
  id: string;
  label: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export type BookingType = "INSTANT" | "SCHEDULED";

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
  customer: CustomerProfile;
  partner?: PartnerProfile;
  service_category: ServiceCategory;
  problem_description: string;
  problem_photo?: string;
  booking_type: BookingType;
  status: BookingStatus;
  service_address_text: string;
  service_latitude?: number;
  service_longitude?: number;
  scheduled_at?: string;
  estimated_duration_minutes: number;
  quoted_price?: number;
  final_price?: number;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface BookingOffer {
  id: string;
  booking: string;
  partner: PartnerProfile;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  batch_number: number;
  expires_at: string;
  created_at: string;
}

export interface BookingStatusHistory {
  id: string;
  from_status: string;
  to_status: string;
  notes: string;
  created_at: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  method: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  gateway_transaction_id?: string;
  created_at: string;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  booking: string;
  customer: CustomerProfile;
  partner: PartnerProfile;
  rating: number;
  comment: string;
  partner_reply?: string;
  partner_replied_at?: string;
  created_at: string;
}

// ── Support ───────────────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  created_at: string;
}

// ── API Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// ── WebSocket events ──────────────────────────────────────────────────────────

export interface WSBookingUpdate {
  type: "booking_update";
  booking_id: string;
  status: BookingStatus;
  partner?: Partial<PartnerProfile>;
  message?: string;
}

export interface WSNewOffer {
  type: "new_offer";
  offer_id: string;
  booking: Partial<Booking>;
  expires_at: string;
}

export type WSEvent = WSBookingUpdate | WSNewOffer | { type: "connection_established" };

// ── Phase 3: Bookings, Slots, Geo-search & Live Tracking Types ───────────────────

export interface AvailabilitySlot {
  time: string;
  display: string;
  is_available: boolean;
  reason: string;
  available_partner_count: number;
}

export interface PartnerLiveLocation {
  partner_id: string;
  partner_name: string;
  partner_phone?: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  distance_km?: number;
  eta_minutes?: number;
  updated_at: string;
  booking_status: BookingStatus;
}

export interface NearbyPartner {
  id: string;
  name: string;
  rating: number;
  total_reviews: number;
  total_jobs_completed: number;
  distance_km: number;
  eta_minutes: number;
  latitude: number;
  longitude: number;
  is_online: boolean;
  services: {
    category_id: string;
    category_name: string;
    effective_price: string;
  }[];
}

export interface WeeklyAvailabilitySlot {
  id?: string;
  day_of_week: number;
  day_display?: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

