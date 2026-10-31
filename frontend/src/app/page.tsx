"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Zap,
  Star,
  Shield,
  Clock,
  ChevronRight,
  MapPin,
  CheckCircle,
  ArrowRight,
  Search,
  Users,
  Flame,
  Award,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CATEGORIES = [
  {
    name: "Electrician",
    icon: Wrench,
    slug: "electrician",
    price: "₹199",
    desc: "Wiring, switchboard, fan & short circuit repairs",
    popular: true,
  },
  {
    name: "Plumber",
    icon: Wrench,
    slug: "plumber",
    price: "₹249",
    desc: "Pipe leakage, tap repairs, motor & sanitary fittings",
    popular: true,
  },
  {
    name: "AC Repair & Jet Service",
    icon: Zap,
    slug: "ac-repair",
    price: "₹499",
    desc: "High pressure jet servicing & gas top-up",
    popular: true,
  },
  {
    name: "Carpenter",
    icon: Wrench,
    slug: "carpenter",
    price: "₹299",
    desc: "Furniture assembly, door hinges & lock repairs",
    popular: false,
  },
  {
    name: "Appliance Repair",
    icon: Zap,
    slug: "appliance-repair",
    price: "₹349",
    desc: "Washing machine, fridge, microwave diagnosis",
    popular: true,
  },
  {
    name: "Home Deep Cleaning",
    icon: Star,
    slug: "cleaning",
    price: "₹599",
    desc: "Full home, bathroom, kitchen & sofa sanitation",
    popular: false,
  },
];

const STATS = [
  { label: "Bookings Completed", value: "25,000+" },
  { label: "Verified Field Pros", value: "1,500+" },
  { label: "Average Dispatch Time", value: "12 Mins" },
  { label: "Customer Satisfaction", value: "4.9 ★" },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/services");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-36 pb-24 overflow-hidden">
          {/* Glowing gradient background effects */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide uppercase">
                <Zap className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                <span>RAPIDO-STYLE REAL-TIME HOME SERVICES • 100% FREE FOR ALL</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight font-heading leading-[1.1]">
                Expert Home Repairs <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                  Matched in Minutes.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Connect with verified local electricians, plumbers, AC technicians, and carpenters near you. Instant broadcast, upfront pricing, and guaranteed satisfaction.
              </p>

              {/* Instant Search Bar */}
              <form
                onSubmit={handleSearch}
                className="pt-4 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 p-2 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80"
              >
                <div className="flex-1 flex items-center px-4 py-2 gap-3">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for electrician, plumber, AC service..."
                    className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                >
                  <span>Find a Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Trust badges */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-medium">All Over Tamil Nadu (38 Districts)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">100% Free • ₹0 Platform Fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>100% Background-Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>10-15 Min Pro Dispatch</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>0% Commission for Partners</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="border-y border-slate-800/80 bg-slate-900/50 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {STATS.map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-3xl sm:text-4xl font-black text-white font-heading">
                    {s.value}
                  </p>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICES CATEGORIES */}
        <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-2">
                OUR SERVICES
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
                Popular Home Services
              </h2>
            </div>
            <Link
              href="/services"
              className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5 uppercase tracking-wider"
            >
              <span>Explore All Categories</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/services/${cat.slug}`}
                className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-orange-500/40 rounded-3xl p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                      <cat.icon className="w-7 h-7" />
                    </div>
                    {cat.popular && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        <Flame className="w-3 h-3 text-orange-400" /> Popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors font-heading mb-2">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {cat.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400">
                    Starts from{" "}
                    <span className="text-sm font-extrabold text-orange-400">
                      {cat.price}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:translate-x-1 transition-transform">
                    Book Now <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-slate-900/40 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">
                RAPIDO MATCHING MODEL
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
                How Eworks Works in 3 Steps
              </h2>
              <p className="text-sm text-slate-400">
                Effortless service request matching designed for real-time convenience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center justify-center font-black text-lg mb-6">
                  01
                </div>
                <h3 className="text-lg font-bold text-white font-heading mb-2">
                  Select Your Problem
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose electrician, plumber, or appliance repair. Describe your issue and pick Instant or Scheduled booking.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center justify-center font-black text-lg mb-6">
                  02
                </div>
                <h3 className="text-lg font-bold text-white font-heading mb-2">
                  Instant Radar Matching
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Our PostGIS engine broadcasts your request to qualified nearby pros. First partner to accept is assigned immediately.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center justify-center font-black text-lg mb-6">
                  03
                </div>
                <h3 className="text-lg font-bold text-white font-heading mb-2">
                  Direct Pay & ₹0 Platform Fee
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Share the start OTP with the pro upon arrival. Inspect completed work and pay directly to the pro via Cash or UPI with zero platform cut.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BECOME A PARTNER CTA */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 sm:p-14 text-slate-950 overflow-hidden shadow-2xl shadow-orange-500/20">
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="text-xs font-black uppercase tracking-wider bg-slate-950/15 text-slate-950 px-3 py-1 rounded-full">
                100% FREE FOR SERVICE PROS • 0% COMMISSION
              </span>
              <h2 className="text-3xl sm:text-5xl font-black font-heading tracking-tight text-slate-950 leading-tight">
                Keep 100% of What You Earn with Eworks Direct Job Offers
              </h2>
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                Receive instant job alerts on your phone. Completely free platform — zero commissions and zero platform deductions. Customers pay you directly.
              </p>
              <div className="pt-2">
                <Link
                  href="/register/partner"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-orange-400 bg-slate-950 hover:bg-slate-900 shadow-xl transition-all"
                >
                  <span>Register as Service Partner</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
