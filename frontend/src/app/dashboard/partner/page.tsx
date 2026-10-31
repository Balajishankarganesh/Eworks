"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  ShieldCheck,
  Power,
  Bell,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  IndianRupee,
  Wrench,
  Star,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Navigation,
  Calendar,
  Save,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  Receipt,
  MessageSquare,
  Sparkles,
  Send,
  CornerDownRight,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { usePartnerStreamWebSocket } from "@/hooks/useWebSockets";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PartnerDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"TASKS" | "SCHEDULE" | "EARNINGS" | "REVIEWS">("TASKS");
  const [isOnline, setIsOnline] = useState(true);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [broadcastingGps, setBroadcastingGps] = useState(false);
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);

  // Phase 6: Earnings states
  const [earningsSummary, setEarningsSummary] = useState<any>(null);
  const [recentEarnings, setRecentEarnings] = useState<any[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutUpi, setPayoutUpi] = useState("partner@upi");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Phase 6: Reviews states
  const [partnerReviews, setPartnerReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Connect real-time Rapido-style offer radar stream over WebSocket
  const { isConnected: wsRadarConnected } = usePartnerStreamWebSocket({
    onNewOffer: (newOffer) => {
      setOffers((prev) => {
        const exists = prev.some((o) => o.id === newOffer.id || o.offer_id === newOffer.offer_id);
        if (exists) return prev;
        return [newOffer, ...prev];
      });
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-4 text-white flex gap-3 items-start`}
          >
            <div className="w-3 h-3 mt-1.5 rounded-full bg-white animate-ping" />
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                New Service Offer Received!
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {newOffer.category_name || "Service Request"} • ₹{newOffer.partner_payout || newOffer.quoted_price}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {newOffer.customer_address} ({newOffer.distance_km || "Nearby"} km)
              </p>
            </div>
          </div>
        ),
        { duration: 7000 }
      );
    },
    onOfferCancelled: (cancelled) => {
      setOffers((prev) => prev.filter((o) => o.id !== cancelled.offer_id && o.offer_id !== cancelled.offer_id));
      toast("Offer was accepted by another technician or timed out.", { icon: "⏱️" });
    },
    onBookingAssigned: () => {
      fetchPartnerData();
    },
  });

  // Weekly Working Hours Schedule
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([
    { day_of_week: 0, day_name: "Monday", start_time: "09:00:00", end_time: "18:00:00", is_available: true },
    { day_of_week: 1, day_name: "Tuesday", start_time: "09:00:00", end_time: "18:00:00", is_available: true },
    { day_of_week: 2, day_name: "Wednesday", start_time: "09:00:00", end_time: "18:00:00", is_available: true },
    { day_of_week: 3, day_name: "Thursday", start_time: "09:00:00", end_time: "18:00:00", is_available: true },
    { day_of_week: 4, day_name: "Friday", start_time: "09:00:00", end_time: "18:00:00", is_available: true },
    { day_of_week: 5, day_name: "Saturday", start_time: "09:00:00", end_time: "17:00:00", is_available: true },
    { day_of_week: 6, day_name: "Sunday", start_time: "10:00:00", end_time: "16:00:00", is_available: false },
  ]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Fetch partner profile, live offers, assigned jobs, and weekly availability
  const fetchPartnerData = async () => {
    try {
      setLoading(true);

      // Partner profile
      try {
        const { data: profile } = await apiClient.get("/auth/me/partner-profile/");
        setPartnerProfile(profile);
        setIsOnline(profile.is_online ?? true);
      } catch (e) {
        // Fallback demo profile
        setPartnerProfile({
          id: "demo-part-1",
          status: "APPROVED",
          is_online: true,
          average_rating: 4.88,
          total_reviews: 24,
          total_jobs_completed: 46,
        });
      }

      // Offers
      try {
        const { data: offersData } = await apiClient.get("/bookings/partner/offers/");
        if (Array.isArray(offersData)) setOffers(offersData);
      } catch (e) {
        // Fallback demo offer
        setOffers([
          {
            id: "off-demo-1",
            booking_id: "bk-991",
            category_name: "Electrician",
            problem_description: "Ceiling fan sparking & MCB trip in 2nd bedroom",
            customer_address: "Flat 4B, Green Meadows, Anna Nagar, Chennai",
            quoted_price: 349.0,
            partner_payout: 296.65,
            distance_km: 1.8,
            expires_at: new Date(Date.now() + 45000).toISOString(),
            batch_number: 1,
          },
        ]);
      }

      // Active / Confirmed Jobs
      try {
        const { data: jobsData } = await apiClient.get("/bookings/partner/jobs/");
        if (Array.isArray(jobsData)) {
          setActiveJobs(jobsData.filter((j: any) => ["MATCHED", "PARTNER_EN_ROUTE", "IN_PROGRESS"].includes(j.status)));
        }
      } catch (e) {
        // Demo active jobs
        setActiveJobs([]);
      }

      // Availability slots
      try {
        const { data: availData } = await apiClient.get("/locations/availability/");
        if (Array.isArray(availData) && availData.length > 0) {
          const merged = DAY_NAMES.map((name, i) => {
            const found = availData.find((a: any) => a.day_of_week === i);
            return (
              found || {
                day_of_week: i,
                day_name: name,
                start_time: "09:00:00",
                end_time: "18:00:00",
                is_available: i < 6,
              }
            );
          });
          setWeeklySchedule(merged);
        }
      } catch (e) {
        // Use default schedule
      }
    } catch (err: any) {
      console.error("Failed to load partner dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 6: Fetch partner earnings
  const fetchEarningsData = async () => {
    try {
      setLoadingEarnings(true);
      const { data } = await apiClient.get("/payments/partner/earnings/");
      setEarningsSummary(data.summary);
      setRecentEarnings(data.recent_earnings || []);
    } catch (err) {
      // Demo fallback earnings
      setEarningsSummary({
        total_gross: 12450.0,
        total_net: 10582.5,
        platform_commission: 1867.5,
        pending_payout: 2840.0,
        completed_payout: 7742.5,
        pending_jobs_count: 3,
        total_jobs_completed: 34,
      });
      setRecentEarnings([
        {
          id: "earn-1",
          booking_id: "bk-882",
          service_title: "Plumbing Repair",
          customer_name: "Rahul Verma",
          gross_amount: 850.0,
          platform_commission: 127.5,
          net_amount: 722.5,
          is_paid_out: false,
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: "earn-2",
          booking_id: "bk-880",
          service_title: "Electrical Inspection",
          customer_name: "Ananya Iyer",
          gross_amount: 1200.0,
          platform_commission: 180.0,
          net_amount: 1020.0,
          is_paid_out: true,
          created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
        },
      ]);
    } finally {
      setLoadingEarnings(false);
    }
  };

  // Phase 6: Fetch partner reviews
  const fetchReviewsData = async (partnerId: string) => {
    try {
      setLoadingReviews(true);
      const { data } = await apiClient.get(`/reviews/partner/${partnerId}/`);
      setReviewStats(data);
      setPartnerReviews(data.reviews || []);
    } catch (err) {
      // Fallback reviews
      setReviewStats({
        average_rating: 4.88,
        total_reviews: 18,
        rating_distribution: {
          "5_star": 15,
          "4_star": 2,
          "3_star": 1,
          "2_star": 0,
          "1_star": 0,
        },
      });
      setPartnerReviews([
        {
          id: "rev-1",
          customer_name: "Karthik R.",
          service_title: "AC Deep Cleaning",
          rating: 5,
          comment: "Punctual ⏱️ • Clean Workspace ✨\n\nTechnician arrived on time with complete gear and thoroughly cleaned both indoor and outdoor units. Super clean work!",
          partner_reply: "Thank you for the kind words, Karthik! Happy to assist.",
          created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        },
        {
          id: "rev-2",
          customer_name: "Deepa S.",
          service_title: "Kitchen Sink Leak Fix",
          rating: 5,
          comment: "Quickly diagnosed the pipe washer issue and fixed it in under 20 minutes. Highly recommended!",
          partner_reply: "",
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        },
      ]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, []);

  useEffect(() => {
    if (activeTab === "EARNINGS") {
      fetchEarningsData();
    } else if (activeTab === "REVIEWS" && partnerProfile?.id) {
      fetchReviewsData(partnerProfile.id);
    }
  }, [activeTab, partnerProfile]);

  // Toggle online / offline status
  const handleToggleOnline = async () => {
    try {
      setTogglingOnline(true);
      const newStatus = !isOnline;
      await apiClient.post("/auth/partner/toggle-online/", { is_online: newStatus });
      setIsOnline(newStatus);
      toast.success(newStatus ? "You are now Online and receiving offers!" : "You are now Offline.");
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || "Could not update online status.";
      toast.error(msg);
    } finally {
      setTogglingOnline(false);
    }
  };

  // Broadcast current GPS location
  const handleBroadcastGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setBroadcastingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await apiClient.post("/locations/partner/update-location/", {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy_meters: pos.coords.accuracy,
          });
          toast.success("GPS Location broadcasted to dispatch engine!");
        } catch (e) {
          toast.error("Failed to update location on server.");
        } finally {
          setBroadcastingGps(false);
        }
      },
      (err) => {
        setBroadcastingGps(false);
        toast.error(`GPS Error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Accept offer
  const handleAcceptOffer = async (offer: any) => {
    try {
      setRespondingOfferId(offer.id);
      const { data } = await apiClient.post(`/bookings/offers/${offer.id}/accept/`);
      toast.success(data.message || "Offer accepted! Proceed to customer location.");
      const bId = offer.booking_id || data.booking_id;
      if (bId) {
        router.push(`/dashboard/partner/job/${bId}`);
      } else {
        fetchPartnerData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Offer already taken by another technician or expired.");
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    } finally {
      setRespondingOfferId(null);
    }
  };

  // Decline offer
  const handleDeclineOffer = async (offerId: string) => {
    try {
      setRespondingOfferId(offerId);
      await apiClient.post(`/bookings/offers/${offerId}/reject/`, {
        reason: "Partner busy or outside target radius",
      });
      toast("Offer passed.", { icon: "👋" });
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (err) {
      toast.error("Failed to decline offer.");
    } finally {
      setRespondingOfferId(null);
    }
  };

  // Save weekly working schedule
  const handleSaveSchedule = async () => {
    try {
      setSavingSchedule(true);
      await apiClient.post("/locations/availability/bulk-update/", {
        schedule: weeklySchedule.map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_available: s.is_available,
        })),
      });
      toast.success("Weekly availability schedule saved!");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save schedule.");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Phase 6: Request Payout
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPayout(true);
      const { data } = await apiClient.post("/payments/partner/request-payout/", {
        upi_id: payoutUpi,
      });
      toast.success(data.message || "Payout requested successfully!");
      setPayoutModalOpen(false);
      fetchEarningsData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to submit payout request.");
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Phase 6: Post Reply to Review
  const handlePostReply = async (reviewId: string) => {
    const text = replyInputs[reviewId]?.trim();
    if (!text) {
      toast.error("Please enter a reply.");
      return;
    }

    try {
      setSubmittingReplyId(reviewId);
      const { data } = await apiClient.post(`/reviews/${reviewId}/reply/`, {
        partner_reply: text,
      });
      toast.success("Reply posted to customer!");
      setPartnerReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, partner_reply: text } : r))
      );
      setReplyInputs((prev) => ({ ...prev, [reviewId]: "" }));
    } catch (err: any) {
      toast.error("Failed to post reply.");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  return (
    <AuthGuard allowedRoles={["PARTNER"]}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
          {/* Top Status & Radar Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/10">
                  {user?.first_name?.charAt(0) || "P"}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-200 ${
                    isOnline ? "bg-emerald-500" : "bg-zinc-600"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Partner"}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isOnline
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isOnline ? "● Live On Duty" : "○ Offline"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                  <span className="text-amber-400 font-bold">★ {partnerProfile?.average_rating || "4.8"} Rating</span>
                  <span>•</span>
                  <span>{partnerProfile?.total_jobs_completed || "40+"} Jobs Settled</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleBroadcastGps}
                disabled={broadcastingGps}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-2"
                title="Pings your live GPS to postgis location table"
              >
                <Navigation className={`w-4 h-4 text-blue-600 ${broadcastingGps ? "animate-spin" : ""}`} />
                <span>{broadcastingGps ? "Pinging GPS..." : "Broadcast GPS"}</span>
              </button>

              <button
                onClick={handleToggleOnline}
                disabled={togglingOnline}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg ${
                  isOnline
                    ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isOnline ? "Go Offline" : "Go Online Now"}</span>
              </button>
            </div>
          </div>

          {/* Verification Pending Notice */}
          {partnerProfile?.status !== "APPROVED" && (
            <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">Account Under Verification</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Our operations team is reviewing your uploaded trade certifications. You can receive test offers and review earnings while we complete verification.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Tabs (Phase 6: Tasks, Schedule, Earnings, Reviews) */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab("TASKS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                activeTab === "TASKS"
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Live Radar & Active ({offers.length + activeJobs.length})
            </button>
            <button
              onClick={() => setActiveTab("SCHEDULE")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === "SCHEDULE"
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>
            <button
              onClick={() => setActiveTab("EARNINGS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === "EARNINGS"
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Earnings & Payouts</span>
            </button>
            <button
              onClick={() => setActiveTab("REVIEWS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === "REVIEWS"
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Customer Reviews</span>
            </button>
          </div>

          {activeTab === "TASKS" && (
            <>
              {/* RAPIDO-STYLE INCOMING OFFERS RADAR */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                    <h2 className="text-lg font-bold text-slate-900 font-heading">
                      Live Job Radar (Incoming Dispatch)
                    </h2>
                    {wsRadarConnected && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        WebSocket Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {offers.length} nearby job{offers.length === 1 ? "" : "s"} waiting
                  </span>
                </div>

                {offers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-700">Searching for new service requests nearby...</p>
                    <p className="text-[11px] text-slate-400 mt-1">Keep your status Online and GPS active to receive instant dispatches</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {offers.map((offer) => (
                      <div
                        key={offer.id}
                        className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/80 border-2 border-blue-300 rounded-3xl p-6 shadow-2xl shadow-blue-500/10 animate-in fade-in zoom-in-95 duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {offer.category_name || "Home Service"}
                          </span>
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            ~{offer.distance_km || 2.5} km away
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                          {offer.problem_description}
                        </h3>

                        <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>{offer.customer_address}</span>
                        </p>

                        <div className="p-3 bg-black/80 rounded-2xl border border-slate-200 flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Your Net Payout</p>
                            <p className="text-xl font-black text-emerald-400 font-mono">
                              ₹{offer.partner_payout || offer.quoted_price}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Quote</p>
                            <p className="text-sm font-bold text-slate-800 font-mono">
                              ₹{offer.quoted_price}
                            </p>
                          </div>
                        </div>

                        {/* Acceptance Controls */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDeclineOffer(offer.id)}
                            disabled={respondingOfferId === offer.id}
                            className="w-1/3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200"
                          >
                            Pass
                          </button>
                          <button
                            onClick={() => handleAcceptOffer(offer)}
                            disabled={respondingOfferId === offer.id}
                            className="w-2/3 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5"
                          >
                            {respondingOfferId === offer.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <span>Accept Job</span>
                                <ArrowRight className="w-4 h-4 stroke-[3]" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTIVE JOBS IN PROGRESS */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading mb-4">
                  Active & Scheduled Jobs ({activeJobs.length})
                </h2>

                {activeJobs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                    No active tasks currently underway. Accepted jobs will appear here with OTP verification tools.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeJobs.map((job) => (
                      <div
                        key={job.id}
                        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              {job.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">#{job.id.slice(0, 8)}</span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 mb-2">{job.category?.name || "Service Job"}</h3>
                          <p className="text-xs text-slate-500 mb-4 line-clamp-2">{job.problem_description}</p>
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-base font-bold text-white font-mono">₹{job.quoted_price}</span>
                          <Link
                            href={`/dashboard/partner/job/${job.id}`}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-zinc-100 text-black text-black font-bold text-xs flex items-center gap-1.5 transition"
                          >
                            <span>Open Job Console</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "SCHEDULE" && (
            /* WEEKLY AVAILABILITY SCHEDULE MANAGER */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-heading">
                    Weekly Working Schedule
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Customers who book scheduled services will only be matched during your active working hours.
                  </p>
                </div>
                <button
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/10"
                >
                  {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Working Schedule</span>
                </button>
              </div>

              <div className="space-y-4">
                {weeklySchedule.map((day, idx) => (
                  <div
                    key={day.day_of_week}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      day.is_available
                        ? "bg-black/80 border-slate-200"
                        : "bg-black/40 border-slate-200/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={day.is_available}
                        onChange={(e) => {
                          const updated = [...weeklySchedule];
                          updated[idx].is_available = e.target.checked;
                          setWeeklySchedule(updated);
                        }}
                        className="w-5 h-5 rounded-lg accent-orange-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-bold text-white">{day.day_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {day.is_available ? "Available for scheduled bookings" : "Off Duty / Day Off"}
                        </p>
                      </div>
                    </div>

                    {day.is_available && (
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                            Shift Start
                          </label>
                          <input
                            type="time"
                            value={day.start_time.slice(0, 5)}
                            onChange={(e) => {
                              const updated = [...weeklySchedule];
                              updated[idx].start_time = `${e.target.value}:00`;
                              setWeeklySchedule(updated);
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono"
                          />
                        </div>
                        <span className="text-slate-400 pt-5">to</span>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                            Shift End
                          </label>
                          <input
                            type="time"
                            value={day.end_time.slice(0, 5)}
                            onChange={(e) => {
                              const updated = [...weeklySchedule];
                              updated[idx].end_time = `${e.target.value}:00`;
                              setWeeklySchedule(updated);
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHASE 6: EARNINGS & PAYOUTS TAB */}
          {activeTab === "EARNINGS" && (
            <div className="space-y-8">
              {/* 4 Stat KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Payout</p>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    ₹{earningsSummary?.pending_payout?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    From {earningsSummary?.pending_jobs_count || 0} unsettled job{earningsSummary?.pending_jobs_count === 1 ? "" : "s"}
                  </p>
                  <button
                    onClick={() => setPayoutModalOpen(true)}
                    disabled={!earningsSummary?.pending_payout || earningsSummary.pending_payout <= 0}
                    className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
                  >
                    Withdraw Funds
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Net Earned (85%)</p>
                  <p className="text-3xl font-black text-white font-mono">
                    ₹{earningsSummary?.total_net?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Lifetime technician earnings</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Total Gross Sales</p>
                  <p className="text-3xl font-black text-slate-800 font-mono">
                    ₹{earningsSummary?.total_gross?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Before platform deductions</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Platform Fee (15%)</p>
                  <p className="text-3xl font-black text-amber-400 font-mono">
                    ₹{earningsSummary?.platform_commission?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Marketplace guarantee & tech fee</p>
                </div>
              </div>

              {/* Settlement History Table */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-white" />
                    Job Earnings Ledger
                  </h3>
                  <span className="text-xs text-slate-500">
                    {recentEarnings.length} completed transactions
                  </span>
                </div>

                {loadingEarnings ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading ledger...</div>
                ) : recentEarnings.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No completed job earnings recorded yet. Once you complete a job, your payout is automatically credited.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 bg-black/60">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Service & Customer</th>
                          <th className="py-3 px-4 text-right">Gross Total</th>
                          <th className="py-3 px-4 text-right">Fee (15%)</th>
                          <th className="py-3 px-4 text-right">Your Net Payout</th>
                          <th className="py-3 px-4 text-center">Payout Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {recentEarnings.map((earn) => (
                          <tr key={earn.id} className="hover:bg-slate-100 transition">
                            <td className="py-3 px-4 text-slate-500 font-mono">
                              {new Date(earn.created_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-white">{earn.service_title}</p>
                              <p className="text-[10px] text-slate-500">{earn.customer_name}</p>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              ₹{Number(earn.gross_amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">
                              -₹{Number(earn.platform_commission).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                              +₹{Number(earn.net_amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  earn.is_paid_out
                                    ? "bg-slate-100 text-slate-700 border-slate-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {earn.is_paid_out ? "Settled" : "Available"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PHASE 6: CUSTOMER REVIEWS TAB */}
          {activeTab === "REVIEWS" && (
            <div className="space-y-8">
              {/* Rating Overview Banner */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-white to-zinc-300 text-black flex flex-col items-center justify-center font-black shadow-2xl shadow-blue-500/10">
                    <span className="text-3xl font-heading">{reviewStats?.average_rating || partnerProfile?.average_rating || "4.9"}</span>
                    <div className="flex text-black mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3 h-3 fill-slate-950" />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Partner Performance Score</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Based on {reviewStats?.total_reviews || partnerProfile?.total_reviews || 0} verified customer reviews
                    </p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Top 5% Rated Technician in your Region
                    </span>
                  </div>
                </div>

                {/* Star Distribution Bars */}
                <div className="w-full md:w-64 space-y-1.5 text-xs text-slate-500">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = reviewStats?.rating_distribution?.[`${s}_star`] || 0;
                    const total = reviewStats?.total_reviews || 1;
                    const pct = Math.min(100, Math.round((count / total) * 100));

                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="w-6 font-mono text-[11px]">{s}★</span>
                        <div className="flex-1 h-2 bg-black rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono text-[10px] text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Customer Testimonials ({partnerReviews.length})
                </h3>

                {loadingReviews ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading reviews...</div>
                ) : partnerReviews.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                    No reviews received yet. Reviews submitted by customers upon job completion will appear here.
                  </div>
                ) : (
                  partnerReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{rev.customer_name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {rev.service_title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating ? "text-amber-400 fill-amber-400" : "text-zinc-700"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(rev.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-black/60 p-3.5 rounded-2xl border border-slate-200">
                          {rev.comment}
                        </p>
                      )}

                      {/* Partner Reply or Reply Form */}
                      {rev.partner_reply ? (
                        <div className="pl-4 border-l-2 border-slate-300 text-xs py-1">
                          <p className="text-[11px] font-bold text-white">Your Response:</p>
                          <p className="text-slate-700 mt-0.5">{rev.partner_reply}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-2">
                          <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={replyInputs[rev.id] || ""}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({ ...prev, [rev.id]: e.target.value }))
                            }
                            placeholder="Write a polite response to this review..."
                            className="flex-1 bg-black border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                          />
                          <button
                            onClick={() => handlePostReply(rev.id)}
                            disabled={submittingReplyId === rev.id}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-orange-400 text-black font-bold text-xs flex items-center gap-1 transition"
                          >
                            {submittingReplyId === rev.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Reply</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>

        {/* Payout Withdrawal Modal */}
        {payoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Request Earnings Withdrawal</h3>
              <p className="text-xs text-slate-500 mb-6">
                Your available balance of{" "}
                <span className="font-bold text-emerald-400 font-mono">
                  ₹{earningsSummary?.pending_payout?.toFixed(2) || "0.00"}
                </span>{" "}
                will be transferred to your registered UPI address.
              </p>

              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <input
                    type="text"
                    value={payoutUpi}
                    onChange={(e) => setPayoutUpi(e.target.value)}
                    placeholder="e.g. mobile@okhdfcbank or user@paytm"
                    className="w-full bg-black border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setPayoutModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayout}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center gap-1.5"
                  >
                    {submittingPayout ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Confirm Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </AuthGuard>
  );
}
