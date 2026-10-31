"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Wrench, Mail, Lock, ArrowRight, Loader2, AlertCircle, ShieldCheck, Phone, KeyRound, Send, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import type { User, AuthTokens } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GoogleAuthButton from "@/components/GoogleAuthButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone OTP login state
  const [authMethod, setAuthMethod] = useState<"PASSWORD" | "PHONE_OTP">("PASSWORD");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Please enter your 10-digit mobile number.");
      return;
    }
    setError(null);
    setSendingOtp(true);
    try {
      const { data } = await apiClient.post("/auth/phone/send-otp/", { phone: phone.trim() });
      toast.success(data.message || "OTP code sent via SMS & WhatsApp!");
      setOtpSent(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Could not send verification code.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    setError(null);
    setVerifyingOtp(true);
    try {
      const { data } = await apiClient.post("/auth/phone/verify-otp/", {
        phone: phone.trim(),
        otp: otp.trim(),
      });
      const user = data.user;
      const tokens = data.tokens;
      login(user, tokens);
      toast.success(data.message || `Welcome back, ${user.first_name || user.phone}!`);

      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (user.role === "PARTNER") {
        router.push("/dashboard/partner");
      } else if (user.role === "CUSTOMER") {
        router.push("/dashboard/customer");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Invalid or expired OTP code.";
      setError(msg);
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post("/auth/login/", {
        email,
        password,
      });

      const data = response.data;
      const user = data.user;
      const tokens = data.tokens || {
        access: data.access,
        refresh: data.refresh,
      };
      login(user, tokens);
      toast.success(`Welcome back, ${user.first_name || user.email}!`);

      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (user.role === "PARTNER") {
        router.push("/dashboard/partner");
      } else if (user.role === "CUSTOMER") {
        router.push("/dashboard/customer");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      const msg = !err?.response
        ? "Backend API is offline: Cannot connect to http://localhost:8000. Please start the backend service."
        : err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Invalid email or password. Please try again.";
      setError(msg);
      toast.error(!err?.response ? "Cannot connect to backend" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-32 relative overflow-hidden">
        {/* Ambient background glows */}
                
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-md">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 items-center justify-center shadow-lg shadow-orange-500/20 mb-4">
                <Wrench className="w-7 h-7 text-slate-950 stroke-[2.5]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
                Sign In to Eworks
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Access your customer bookings or partner dashboard
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication */}
            <div className="mb-6">
              <GoogleAuthButton mode="signin" />
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/95 px-3 text-slate-400 font-semibold tracking-wider">
                    Or choose sign in method
                  </span>
                </div>
              </div>
            </div>

            {/* Method Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("PASSWORD");
                  setError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authMethod === "PASSWORD"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("PHONE_OTP");
                  setError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authMethod === "PHONE_OTP"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-orange-500" />
                <span>Phone OTP</span>
              </button>
            </div>

            {/* PASSWORD LOGIN FORM */}
            {authMethod === "PASSWORD" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <a href="#" className="text-xs text-orange-500 hover:underline font-medium">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PHONE OTP LOGIN FORM */}
            {authMethod === "PHONE_OTP" && (
              <div className="space-y-5">
                {!otpSent ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                        10-Digit Mobile Number
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-xs text-slate-500">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="9876543210"
                          maxLength={10}
                          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-mono tracking-wider"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        We will send a 6-digit OTP code to your phone via SMS & WhatsApp.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingOtp}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {sendingOtp ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Get Verification Code</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block">OTP Sent to:</span>
                        <span className="font-bold text-slate-900 font-mono">+91 {phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-orange-600 hover:underline font-semibold"
                      >
                        Change
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                        Enter 6-Digit OTP Code
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="w-5 h-5 text-orange-500" />
                        </div>
                        <input
                          type="text"
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="e.g. 123456"
                          maxLength={6}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-base font-mono tracking-widest text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={verifyingOtp}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {verifyingOtp ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Sign In</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={sendingOtp}
                      className="w-full text-center text-xs text-orange-600 hover:underline font-semibold pt-1"
                    >
                      {sendingOtp ? "Resending..." : "Didn't receive code? Resend OTP"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Quick credentials helper for test / demo */}
            <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
              <p className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-orange-500" /> 1-Click Quick Fill Credentials:
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("customer@eworks.com");
                    setPassword("Customer@123");
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold text-center transition shadow-sm"
                >
                  Customer (Priya)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("balajishankarganesh01@gmail.com");
                    setPassword("Balaji@123");
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold text-center transition shadow-sm"
                >
                  Partner (Balaji)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("partner@eworks.com");
                    setPassword("Partner@123");
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold text-center transition shadow-sm"
                >
                  Partner (Ramesh)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@eworks.com");
                    setPassword("Admin@123");
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold text-center transition shadow-sm"
                >
                  Admin System
                </button>
              </div>
            </div>

            {/* Switch to Register */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-3">
              <p className="text-xs text-slate-500">
                New to Eworks?{" "}
                <Link
                  href="/register/customer"
                  className="font-bold text-orange-500 hover:underline font-semibold"
                >
                  Create a Customer Account
                </Link>
              </p>
              <p className="text-xs text-slate-400">
                Want to earn as a service pro?{" "}
                <Link
                  href="/register/partner"
                  className="font-semibold text-emerald-400 hover:underline"
                >
                  Register as Service Partner
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
