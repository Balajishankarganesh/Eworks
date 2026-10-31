"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Phone,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Clock,
  IndianRupee,
  Navigation,
  Wrench,
  AlertCircle,
  Loader2,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";
import apiClient from "@/lib/api-client";

export default function PartnerJobExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [finalPriceInput, setFinalPriceInput] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const fetchJob = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/bookings/${bookingId}/`);
      setBooking(data);
      setFinalPriceInput(data.quoted_price ? String(data.quoted_price) : "");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not load job details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Partner marks they are on the way
  const handleMarkEnRoute = async () => {
    try {
      setActionLoading(true);
      const { data } = await apiClient.post(`/bookings/${bookingId}/en-route/`);
      toast.success("Updated: You are marked as en route to customer.");
      setBooking(data.data || { ...booking, status: "PARTNER_EN_ROUTE" });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Partner verifies customer OTP to start job
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length !== 4) {
      toast.error("Please enter the 4-digit code provided by the customer.");
      return;
    }

    try {
      setActionLoading(true);
      const { data } = await apiClient.post(`/bookings/${bookingId}/start-job/`, {
        otp: otpInput.trim(),
      });
      toast.success("OTP Verified! Job is officially in progress.");
      setOtpModalOpen(false);
      setBooking(data.data || { ...booking, status: "IN_PROGRESS" });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid OTP code.");
    } finally {
      setActionLoading(false);
    }
  };

  // Partner marks job completed
  const handleCompleteJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const { data } = await apiClient.post(`/bookings/${bookingId}/complete/`, {
        final_price: finalPriceInput ? parseFloat(finalPriceInput) : undefined,
        notes: completionNotes.trim() || "Service executed and verified with customer.",
      });
      toast.success("Job completed successfully! Payout recorded.");
      setCompleteModalOpen(false);
      setBooking(data.data || { ...booking, status: "COMPLETED" });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to complete job.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading field job details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 max-w-lg mx-auto px-4 pt-40 pb-20 text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Job Not Found</h2>
          <p className="text-slate-500 mt-2 mb-6">
            This job reference does not exist or has already been assigned to another partner.
          </p>
          <Link
            href="/dashboard/partner"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Partner Portal
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isEnRoute = booking.status === "PARTNER_EN_ROUTE";
  const isInProgress = booking.status === "IN_PROGRESS";
  const isCompleted = booking.status === "COMPLETED";

  return (
    <AuthGuard allowedRoles={["PARTNER"]}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <Link
                href="/dashboard/partner"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Partner Portal
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Field Job Execution
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
                  #{booking.id.slice(0, 8)}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                  {booking.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {booking.customer_details?.phone && (
              <a
                href={`tel:${booking.customer_details.phone}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
              >
                <Phone className="w-4 h-4" /> Call Customer ({booking.customer_details.name})
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Columns: Action Stepper & Execution Card */}
            <div className="lg:col-span-7 space-y-6">
              {/* Active Action Controls */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-white" /> Current Step in Dispatch Cycle
                </h3>

                {/* Step 1: Mark En Route */}
                {["MATCHED", "CONFIRMED"].includes(booking.status) && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <p className="font-semibold text-slate-900 mb-1">Step 1: Start Journey</p>
                      <p className="text-slate-500">
                        Tap below when you begin traveling toward the customer location so they receive live ETA tracking on their app.
                      </p>
                    </div>
                    <button
                      onClick={handleMarkEnRoute}
                      disabled={actionLoading}
                      className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-blue-500/10 transition flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      <span>I AM EN ROUTE TO CUSTOMER</span>
                    </button>
                  </div>
                )}

                {/* Step 2: Arrived & Verify OTP */}
                {isEnRoute && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <p className="font-bold mb-1">Step 2: Authenticate Job Start</p>
                      <p className="text-slate-700">
                        You have arrived at the customer location. Ask the customer for their 4-digit verification OTP before starting the work.
                      </p>
                    </div>
                    <button
                      onClick={() => setOtpModalOpen(true)}
                      className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-blue-500/10 transition flex items-center justify-center gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>ENTER CUSTOMER 4-DIGIT OTP</span>
                    </button>
                  </div>
                )}

                {/* Step 3: Work in Progress & Finish */}
                {isInProgress && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      <p className="font-bold mb-1">Step 3: Service In Progress</p>
                      <p className="text-emerald-700">
                        Job started at {new Date(booking.started_at || Date.now()).toLocaleTimeString()}. Once your repair or installation is completed and verified, mark the job complete below.
                      </p>
                    </div>
                    <button
                      onClick={() => setCompleteModalOpen(true)}
                      className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>MARK SERVICE COMPLETED</span>
                    </button>
                  </div>
                )}

                {/* Step 4: Completed State */}
                {isCompleted && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">Job Successfully Completed</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Final payment of ₹{booking.final_price || booking.quoted_price} has been logged to your partner account.
                    </p>
                  </div>
                )}
              </div>

              {/* Customer & Location Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" /> Customer & Navigation
                </h3>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <p className="text-slate-500">Customer Name:</p>
                  <p className="text-base font-bold text-slate-900">
                    {booking.customer_details?.name || "Customer"}
                  </p>
                  <p className="text-slate-500 pt-2">Service Address:</p>
                  <p className="text-slate-800 font-medium">
                    {booking.service_address_text}
                  </p>
                </div>

                {booking.service_latitude && booking.service_longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${booking.service_latitude},${booking.service_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200"
                  >
                    <Navigation className="w-4 h-4 text-orange-500" />
                    <span>Open in Google Maps</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right 5 Columns: Service Spec & Payment */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {booking.category?.name}
                </span>

                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-500 mb-1">
                    Customer Reported Problem
                  </h3>
                  <p className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    &quot;{booking.problem_description}&quot;
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Base Quoted Payout</span>
                    <span className="text-slate-900 font-mono font-bold">₹{booking.quoted_price}</span>
                  </div>
                  {booking.final_price && (
                    <div className="flex justify-between text-slate-500">
                      <span>Final Settled Payout</span>
                      <span className="text-emerald-500 font-mono font-bold">₹{booking.final_price}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                    <div>
                      <span>Your Earnings</span>
                      <p className="text-[10px] text-emerald-600 font-semibold">100% Direct Payout • 0% Commission</p>
                    </div>
                    <span className="text-xl font-extrabold text-emerald-600 font-mono">
                      ₹{booking.final_price || booking.quoted_price}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* OTP Input Modal */}
        {otpModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Enter Customer OTP</h3>
              <p className="text-xs text-slate-500 mb-6">
                Ask the customer for the 4-digit code shown on their tracking screen.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • •"
                  className="w-full text-center text-3xl font-mono font-extrabold tracking-widest py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-none focus:border-blue-600 shadow-inner"
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOtpModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || otpInput.length !== 4}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-black font-extrabold text-xs uppercase disabled:opacity-60 flex items-center justify-center gap-1"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Verify & Start
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Complete Job Modal */}
        {completeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Confirm Job Completion</h3>
              <p className="text-xs text-slate-500 mb-4">
                Confirm final billing amount and describe the work completed.
              </p>

              <form onSubmit={handleCompleteJob} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Final Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={finalPriceInput}
                    onChange={(e) => setFinalPriceInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="249.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Completion Notes / Parts Replaced
                  </label>
                  <textarea
                    rows={3}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="e.g. Replaced capacitor, cleaned AC filters, inspected electrical connection..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompleteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Confirm Completion
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
