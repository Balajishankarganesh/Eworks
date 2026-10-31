"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  MapPin,
  Wrench,
  ShieldCheck,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowLeft,
  RefreshCw,
  Navigation,
  KeyRound,
  Calendar,
  IndianRupee,
  ChevronRight,
  Loader2,
  CreditCard,
  Receipt,
  Printer,
  Star,
  ThumbsUp,
  Sparkles,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";
import apiClient from "@/lib/api-client";
import { useBookingWebSocket } from "@/hooks/useWebSockets";
import type { BookingStatus, PartnerLiveLocation } from "@/types";

const STATUS_STEPS: { key: BookingStatus; label: string; description: string }[] = [
  {
    key: "PENDING_MATCH",
    label: "Request Placed",
    description: "Broadcasting to nearby verified service partners",
  },
  {
    key: "MATCHED",
    label: "Partner Assigned",
    description: "Partner accepted your booking and is preparing",
  },
  {
    key: "PARTNER_EN_ROUTE",
    label: "Partner En Route",
    description: "Partner is traveling to your service address",
  },
  {
    key: "IN_PROGRESS",
    label: "Service In Progress",
    description: "OTP verified. Technician working on your task",
  },
  {
    key: "COMPLETED",
    label: "Service Completed",
    description: "Job successfully finished and tested",
  },
];

const QUICK_REVIEW_TAGS = [
  "Punctual ⏱️",
  "Great Workmanship 🔧",
  "Polite Professional 🤝",
  "Clean Workspace ✨",
  "Fair Pricing 💰",
];

export default function BookingTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [partnerLocation, setPartnerLocation] = useState<PartnerLiveLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [retryingMatching, setRetryingMatching] = useState(false);

  // Phase 6: Payment states
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("UPI");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Phase 6: Invoice modal states
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Phase 6: Review states
  const [reviewData, setReviewData] = useState<any>(null);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [commentInput, setCommentInput] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Real-time zero-polling WebSocket connection for booking updates & live partner GPS
  const { isConnected: wsConnected } = useBookingWebSocket(bookingId, {
    onUpdate: (data) => {
      setBooking((prev: any) => ({ ...prev, ...data }));
      if (data?.status && data.status !== booking?.status) {
        toast.success(`Booking status: ${data.status.replace(/_/g, " ")}`);
      }
      fetchBookingData(true);
    },
    onLocation: (loc) => {
      setPartnerLocation((prev: any) => ({ ...prev, ...loc }));
    },
  });

  const handleRetryMatching = async () => {
    try {
      setRetryingMatching(true);
      const { data } = await apiClient.post(`/matching/retry/${bookingId}/`);
      toast.success(data.message || "Matching restarted with expanded search radius!");
      fetchBookingData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || "Failed to retry matching.");
    } finally {
      setRetryingMatching(false);
    }
  };

  const fetchPaymentAndReview = useCallback(async () => {
    try {
      // Payment details
      const { data: pData } = await apiClient.get(`/payments/booking/${bookingId}/`);
      setPaymentInfo(pData);
    } catch (e) {
      // Payment endpoint might not have record yet
    }

    try {
      // Review details
      const { data: rData } = await apiClient.get(`/reviews/booking/${bookingId}/`);
      if (rData?.has_reviewed && rData?.review) {
        setReviewData(rData.review);
      }
    } catch (e) {
      // No review yet
    }
  }, [bookingId]);

  const fetchBookingData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const { data: bData } = await apiClient.get(`/bookings/${bookingId}/`);
      setBooking(bData);

      // If partner is assigned or en route, fetch partner live location & ETA
      if (bData.partner_details && ["MATCHED", "PARTNER_EN_ROUTE", "IN_PROGRESS"].includes(bData.status)) {
        try {
          const { data: locData } = await apiClient.get(`/bookings/${bookingId}/partner-location/`);
          setPartnerLocation(locData);
        } catch (e) {
          // Location tracking not available yet
        }
      }

      // If completed, fetch payment and review info
      if (bData.status === "COMPLETED") {
        fetchPaymentAndReview();
      }
    } catch (err: any) {
      if (!isSilent) {
        toast.error(err?.response?.data?.detail || "Could not load booking details.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId, fetchPaymentAndReview]);

  useEffect(() => {
    fetchBookingData();
    // Fallback heartbeat (30s if WebSocket connected, 6s if disconnected)
    const interval = setInterval(() => {
      fetchBookingData(true);
    }, wsConnected ? 30000 : 6000);
    return () => clearInterval(interval);
  }, [fetchBookingData, wsConnected]);

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error("Please enter a cancellation reason.");
      return;
    }

    try {
      setCancelling(true);
      await apiClient.post(`/bookings/${bookingId}/cancel/`, {
        reason: cancelReason,
      });
      toast.success("Booking cancelled successfully.");
      setCancelModalOpen(false);
      fetchBookingData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  // Phase 6: Handle payment checkout
  const handlePayNow = async () => {
    try {
      setProcessingPayment(true);
      // 1. Create Order
      const { data: orderData } = await apiClient.post("/payments/create-order/", {
        booking_id: bookingId,
        method: selectedMethod,
      });

      // 2. Verify / Settle
      const verifyPayload = {
        payment_id: orderData.payment_id,
        gateway_payment_id: `pay_mock_${Date.now()}`,
        gateway_signature: "sig_valid_eworks_token",
        method: selectedMethod,
      };

      const { data: verifyData } = await apiClient.post("/payments/verify/", verifyPayload);
      toast.success(verifyData.message || "Payment completed successfully!");
      fetchPaymentAndReview();
      fetchBookingData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Phase 6: Handle View / Download Invoice
  const handleOpenInvoice = async () => {
    try {
      setLoadingInvoice(true);
      setInvoiceModalOpen(true);
      const { data } = await apiClient.get(`/payments/booking/${bookingId}/invoice/`);
      setInvoiceData(data);
    } catch (err: any) {
      toast.error("Could not generate invoice.");
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Phase 6: Handle Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingInput < 1) {
      toast.error("Please select a rating of at least 1 star.");
      return;
    }

    const fullComment = selectedTags.length > 0
      ? `${selectedTags.join(" • ")}\n\n${commentInput.trim()}`
      : commentInput.trim();

    try {
      setSubmittingReview(true);
      const { data } = await apiClient.post("/reviews/", {
        booking_id: bookingId,
        rating: ratingInput,
        comment: fullComment,
      });

      toast.success(data.message || "Review submitted! Thank you.");
      setReviewData(data.review);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (loading && !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading booking telemetry...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-32 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Booking Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">
            The booking request you are trying to view does not exist or you do not have permission.
          </p>
          <Link
            href="/dashboard/customer"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm inline-block"
          >
            Go to My Bookings
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isCancelled = ["CANCELLED_CUSTOMER", "CANCELLED_PARTNER", "CANCELLED_ADMIN"].includes(
    booking.status
  );
  const isNoPartners = booking.status === "NO_PARTNERS";
  const isCompleted = booking.status === "COMPLETED";
  const isPaid = paymentInfo?.is_paid || booking.payment?.status === "SUCCESS";

  // Compute step index
  const getStepIndex = (status: BookingStatus) => {
    switch (status) {
      case "PENDING_MATCH":
      case "MATCHING":
        return 0;
      case "MATCHED":
      case "CONFIRMED":
        return 1;
      case "PARTNER_EN_ROUTE":
        return 2;
      case "IN_PROGRESS":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(booking.status);

  return (
    <AuthGuard allowedRoles={["CUSTOMER", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
          {/* Top navigation & Live Status Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <Link
                href="/dashboard/customer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to My Bookings
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Tracking Booking
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
                  #{booking.id.slice(0, 8)}
                </span>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  wsConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {wsConnected ? "WebSocket Live" : "Polling Fallback"}
                </span>
              </div>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchBookingData()}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-600 transition flex items-center justify-center border border-slate-200"
                title="Refresh booking"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
              </button>

              {!isCancelled && !isCompleted && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-xs transition"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>

          {/* Cancellation Banner */}
          {isCancelled && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-6 mb-8 flex items-start gap-4">
              <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-rose-400">
                  This Booking Was Cancelled
                </h3>
                <p className="text-xs text-slate-700 mt-1">
                  Reason: {booking.cancellation_reason || "Cancelled by customer request."}
                </p>
              </div>
            </div>
          )}

          {/* No Partners Available Banner with Retry */}
          {isNoPartners && (
            <div className="bg-white/5 border border-slate-200 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-amber-300">
                    No Partners Currently Available
                  </h3>
                  <p className="text-xs text-slate-700 mt-1">
                    All nearby technicians were busy during the initial dispatch. You can expand the search radius or retry instantly.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRetryMatching}
                disabled={retryingMatching}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold font-bold text-xs shadow-lg shadow-blue-500/10 transition flex items-center gap-2 self-start sm:self-auto"
              >
                {retryingMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Retry (Expand Radius)</span>
              </button>
            </div>
          )}

          {/* Progress Tracker Stepper */}
          {!isCancelled && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl backdrop-blur-md">
              <div className="relative">
                {/* Connecting track */}
                <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0" />
                <div
                  className="hidden md:block absolute top-1/2 left-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 -translate-y-1/2 transition-all duration-700 z-0"
                  style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div key={step.key} className="flex md:flex-col items-center md:text-center gap-4 md:gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs transition-all shadow-md ${
                            isCurrent
                              ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-black ring-4 ring-orange-500/20 scale-110"
                              : isDone
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {isDone && !isCurrent ? (
                            <CheckCircle2 className="w-5 h-5 text-slate-950" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-bold ${
                              isCurrent ? "text-orange-500" : isDone ? "text-slate-900" : "text-slate-500"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-slate-500 hidden md:block mt-1">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Columns: Partner, Security OTP, and Phase 6 Payment & Review Cards */}
            <div className="lg:col-span-7 space-y-6">
              {/* Job Start OTP Box - Highest priority security element */}
              {booking.job_start_otp && !isCancelled && !isCompleted && (
                <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-slate-100 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-3">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                      Job Verification OTP
                    </h3>
                  </div>
                  <p className="text-xs text-slate-700 mb-6">
                    Share this 4-digit code with your service technician when they arrive at your door to authenticate and begin the service.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {booking.job_start_otp.split("").map((digit: string, i: number) => (
                        <div
                          key={i}
                          className="w-14 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center text-3xl font-mono font-extrabold shadow-sm"
                        >
                          {digit}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-slate-700 font-medium">
                      Never share this code over phone before the partner arrives.
                    </span>
                  </div>
                </div>
              )}

              {/* PHASE 6: PAYMENT DUE / PAID STATUS CARD (When Job is Completed) */}
              {isCompleted && (
                <div className="bg-white/95 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isPaid ? "bg-emerald-500/20 text-emerald-600" : "bg-blue-100 text-blue-800"
                      }`}>
                        {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {isPaid ? "Payment Completed & Verified" : "Payment Due for Completed Service"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {isPaid
                            ? `Settled via ${paymentInfo?.payment?.method || "Online"} (Txn: ${paymentInfo?.payment?.gateway_transaction_id || "TXN-XXXX"})`
                            : "Technician marked the job completed. Settle dues online or via Cash."}
                        </p>
                      </div>
                    </div>

                    {isPaid && (
                      <button
                        onClick={handleOpenInvoice}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 flex items-center gap-2 transition shadow-sm"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>View Invoice</span>
                      </button>
                    )}
                  </div>

                  {!isPaid ? (
                    <div className="space-y-6">
                      {/* Price summary pill */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Total Billed Amount</p>
                          <p className="text-2xl font-black text-white font-mono">
                            ₹{paymentInfo?.pricing?.total_amount || booking.final_price || booking.quoted_price}
                          </p>
                        </div>
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                          Includes ₹29 Platform Fee + 18% GST
                        </span>
                      </div>

                      {/* Payment Method Selector */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                          Select Payment Mode
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { id: "UPI", label: "UPI / QR", desc: "GPay, PhonePe, Paytm" },
                            { id: "CARD", label: "Cards", desc: "Visa, Mastercard" },
                            { id: "NETBANKING", label: "NetBanking", desc: "All Indian Banks" },
                            { id: "CASH", label: "Cash", desc: "Pay directly to Pro" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedMethod(m.id)}
                              className={`p-3 rounded-2xl border text-left transition ${
                                selectedMethod === m.id
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm font-semibold"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <p className="text-xs font-bold text-white">{m.label}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{m.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pay Action Button */}
                      <button
                        onClick={handlePayNow}
                        disabled={processingPayment}
                        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold font-black text-sm shadow-xl shadow-blue-500/10 transition flex items-center justify-center gap-2"
                      >
                        {processingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Authenticating & Processing Payment...</span>
                          </>
                        ) : (
                          <>
                            <span>Pay ₹{paymentInfo?.pricing?.total_amount || booking.final_price || booking.quoted_price} Now</span>
                            <ChevronRight className="w-4 h-4 stroke-[3]" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-emerald-600">Paid in Full</p>
                          <p className="text-[11px] text-slate-500">All partner and platform service dues are settled.</p>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono text-emerald-600">
                        ₹{paymentInfo?.payment?.amount || booking.total_amount || booking.final_price || booking.quoted_price}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* PHASE 6: CUSTOMER REVIEW & STAR RATING CARD (When Job is Completed) */}
              {isCompleted && (
                <div className="bg-white/95 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <h3 className="text-base font-bold text-slate-900">
                      {reviewData ? "Your Review for this Service" : `Rate & Review ${booking.partner_details?.name || "Service Partner"}`}
                    </h3>
                  </div>

                  {reviewData ? (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= reviewData.rating ? "text-amber-400 fill-amber-400" : "text-slate-400"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(reviewData.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {reviewData.comment && (
                        <p className="text-xs text-slate-700 leading-relaxed italic">
                          "{reviewData.comment}"
                        </p>
                      )}

                      {reviewData.partner_reply && (
                        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-slate-200 text-xs">
                          <p className="font-bold text-white text-[11px] mb-0.5">Partner Response:</p>
                          <p className="text-slate-700">{reviewData.partner_reply}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      {/* Interactive Stars */}
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRatingInput(s)}
                            onMouseEnter={() => setRatingHover(s)}
                            onMouseLeave={() => setRatingHover(0)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                s <= (ratingHover || ratingInput)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-zinc-700"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-amber-400 ml-2">
                          {ratingHover || ratingInput} Star{(ratingHover || ratingInput) === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* Quick Tag Pills */}
                      <div>
                        <p className="text-[11px] text-slate-500 mb-2">What went especially well?</p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_REVIEW_TAGS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                selectedTags.includes(tag)
                                  ? "bg-amber-400 text-black border-amber-400 font-bold"
                                  : "bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Detailed Comment Box */}
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Write a few words about your experience (optional)..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 transition"
                      />

                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold font-bold text-xs shadow-md shadow-blue-500/10 transition flex items-center gap-2"
                      >
                        {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>Submit Feedback</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Partner Information Card or Matching Radar */}
              {booking.partner_details ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-black font-bold text-2xl flex items-center justify-center shadow-lg">
                        {booking.partner_details.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-extrabold text-slate-900">
                            {booking.partner_details.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-xs font-semibold">
                            Verified Pro
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span className="text-amber-400 font-bold">★ {booking.partner_details.rating} Rating</span>
                          <span>•</span>
                          <span>{booking.partner_details.total_jobs} Jobs Completed</span>
                        </p>
                      </div>
                    </div>

                    {booking.partner_details.phone && (
                      <a
                        href={`tel:${booking.partner_details.phone}`}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 text-white hover:bg-zinc-100 text-black text-black font-bold text-xs transition shadow-lg shadow-blue-500/10"
                      >
                        <Phone className="w-4 h-4" /> Call Partner
                      </a>
                    )}
                  </div>

                  {/* Partner Live Proximity / ETA */}
                  {partnerLocation && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Navigation className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {booking.status === "PARTNER_EN_ROUTE"
                                ? "Partner is on the way"
                                : booking.status === "IN_PROGRESS"
                                ? "Partner is currently working"
                                : "Partner assigned"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {partnerLocation.distance_km != null
                                ? `Approx. ${partnerLocation.distance_km} km away from your location`
                                : "Location tracking active"}
                            </p>
                          </div>
                        </div>

                        {partnerLocation.eta_minutes != null && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Estimated Arrival</p>
                            <p className="text-lg font-extrabold text-white font-mono">
                              ~{partnerLocation.eta_minutes} mins
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Background-verified professional with genuine identity proofs on file.</span>
                  </div>
                </div>
              ) : (
                /* Matching in progress pulse */
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl">
                  <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-white/15 animate-ping" />
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-black shadow-xl shadow-blue-500/10 relative z-10">
                      <Zap className="w-8 h-8 animate-bounce" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Finding Your Nearest Service Partner
                  </h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Dispatch Batch {booking.matching_attempts || 1} of 3</span>
                    <span>•</span>
                    <span>~{10 + Math.max(0, (booking.matching_attempts || 1) - 1) * 5} km search radius</span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Our Rapido-style instant dispatch engine is pinging top-rated nearby pros. The first certified pro to accept is immediately assigned to your doorstep.
                  </p>
                </div>
              )}

              {/* Status Audit Timeline */}
              {booking.status_history && booking.status_history.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white" /> Booking Activity Trail
                  </h3>
                  <div className="space-y-4">
                    {booking.status_history.map((hist: any) => (
                      <div key={hist.id} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-4 py-1">
                        <div className="flex-1">
                          <p className="text-slate-800 font-semibold">{hist.to_status.replace(/_/g, " ")}</p>
                          {hist.notes && <p className="text-slate-500 mt-0.5">{hist.notes}</p>}
                        </div>
                        <span className="text-slate-500 font-mono">
                          {new Date(hist.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Columns: Service Details & Cost */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {booking.booking_type === "INSTANT" ? "⚡ Instant Rapido Booking" : "📅 Scheduled Booking"}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-3">
                    {booking.category?.name || "Home Service"}
                  </h2>
                </div>

                <div className="space-y-4 py-4 border-y border-slate-200 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-500 block mb-1">Problem Description:</span>
                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
                      {booking.problem_description}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block mb-0.5">Service Location:</span>
                      <p className="text-slate-800">{booking.service_address_text}</p>
                    </div>
                  </div>

                  {booking.scheduled_at && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500 block mb-0.5">Scheduled Date & Time:</span>
                        <p className="text-slate-800">
                          {new Date(booking.scheduled_at).toLocaleString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Base Service Quote</span>
                    <span className="text-slate-800 font-mono">₹{booking.quoted_price || "0.00"}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Platform Convenience Fee</span>
                    <span className="text-slate-800 font-mono">₹29.00</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST (18%)</span>
                    <span className="text-slate-800 font-mono">₹5.22</span>
                  </div>
                  {booking.final_price && (
                    <div className="flex justify-between text-slate-500">
                      <span>Final Partner Adjustment</span>
                      <span className="text-slate-800 font-mono">₹{booking.final_price}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-white">
                    <span>Total Payable</span>
                    <span className="text-xl font-extrabold text-white font-mono">
                      ₹{paymentInfo?.pricing?.total_amount || (Number(booking.final_price || booking.quoted_price || 0) + 34.22).toFixed(2)}
                    </span>
                  </div>
                </div>

                {isPaid ? (
                  <div className="text-center py-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Invoice Ready
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center">
                    Payment is made directly upon job completion.
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Tax Invoice Modal */}
        {invoiceModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-black text-sm">
                    E
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Tax Invoice</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Eworks Hyperlocal Services Pvt Ltd</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-600 transition"
                    title="Print Invoice"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setInvoiceModalOpen(false)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-600 transition"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {loadingInvoice || !invoiceData ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading invoice data...</div>
              ) : (
                <div className="space-y-6 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Invoice Details</p>
                      <p className="font-bold text-white mt-0.5">{invoiceData.invoice_number}</p>
                      <p className="text-slate-500 mt-0.5">Date: {invoiceData.invoice_date}</p>
                      <p className="text-slate-500 mt-0.5">Status: <span className="text-emerald-600 font-bold">{invoiceData.status}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Transaction ID</p>
                      <p className="font-mono text-slate-800 mt-0.5">{invoiceData.transaction_id || "N/A"}</p>
                      <p className="text-slate-500 mt-0.5">Method: {invoiceData.payment_method}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Billed To (Customer)</p>
                      <p className="font-bold text-white mt-1">{invoiceData.customer?.name}</p>
                      <p className="text-slate-500 mt-0.5">{invoiceData.customer?.email}</p>
                      <p className="text-slate-500 mt-0.5">{invoiceData.customer?.phone}</p>
                      <p className="text-slate-500 mt-0.5 truncate">{invoiceData.customer?.address}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Certified Professional</p>
                      <p className="font-bold text-white mt-1">{invoiceData.partner?.name}</p>
                      <p className="text-slate-500 mt-0.5">Phone: {invoiceData.partner?.phone}</p>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Description</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-3 px-4 font-semibold text-white">
                            {invoiceData.service?.category} ({invoiceData.service?.description})
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            ₹{invoiceData.pricing?.service_price?.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-slate-500">Platform Convenience Fee</td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            ₹{invoiceData.pricing?.convenience_fee?.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-slate-500">GST on Platform Fee ({invoiceData.pricing?.gst_rate})</td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            ₹{invoiceData.pricing?.gst_amount?.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="bg-black font-bold text-white">
                          <td className="py-3 px-4 text-sm">Grand Total (INR)</td>
                          <td className="py-3 px-4 text-right text-base text-white font-mono font-black">
                            ₹{invoiceData.pricing?.total_payable?.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[10px] text-slate-400 text-center pt-2">
                    This is an electronically generated invoice and does not require a physical signature. GSTIN: 33AAACH1234F1Z8.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Service Booking?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Please provide a brief reason for cancelling. Free cancellation is allowed before partner dispatch.
              </p>
              <form onSubmit={handleCancelBooking} className="space-y-4">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Plans changed, booked by mistake, problem resolved..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                  >
                    Keep Booking
                  </button>
                  <button
                    type="submit"
                    disabled={cancelling}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition flex items-center gap-1.5"
                  >
                    {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Confirm Cancellation
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
