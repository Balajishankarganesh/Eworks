"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Clock,
  Shield,
  Zap,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import type { ServiceAddress } from "@/types";

const CATEGORY_MAP: Record<string, any> = {
  electrician: {
    name: "Electrician Service",
    description: "Expert electrical installation, repairs, short circuit fixes, wiring, and appliance setup.",
    base_price: 199,
    estimated_duration_minutes: 45,
    features: [
      "Certified and licensed technicians",
      "Standard rates with transparent inspection fees",
      "30-day post-service rework warranty",
      "All necessary tools and testing meters carried",
    ],
  },
  plumber: {
    name: "Plumbing Service",
    description: "Leak fix, tap repair, pipe fitting, water tank maintenance, bathroom sanitary ware.",
    base_price: 249,
    estimated_duration_minutes: 60,
    features: [
      "Leakage detection and zero-damage pipe fitting",
      "Genuine replacement parts provided",
      "Post-work cleanup included",
      "Emergency burst pipe assistance",
    ],
  },
  "ac-repair": {
    name: "AC Repair & Jet Servicing",
    description: "Deep jet cleaning, gas charging, cooling issue diagnosis, compressor service.",
    base_price: 499,
    estimated_duration_minutes: 90,
    features: [
      "High-pressure water jet cleaning",
      "Refrigerant leak detection & top-up",
      "Comprehensive 10-point cooling check",
      "Filter sanitation & odor elimination",
    ],
  },
  carpenter: {
    name: "Carpenter & Woodwork",
    description: "Furniture assembly, door hinges, lock installations, custom wooden repair.",
    base_price: 299,
    estimated_duration_minutes: 60,
    features: [
      "Precision door alignment & lock fixes",
      "IKEA and flatpack furniture assembly",
      "Custom hinge repairs & woodwork",
      "Noise-damped drill equipment",
    ],
  },
  "appliance-repair": {
    name: "Appliance Repair",
    description: "Washing machine, refrigerator, microwave oven, and water purifier diagnostics.",
    base_price: 349,
    estimated_duration_minutes: 75,
    features: [
      "Diagnosis across top appliance brands",
      "Transparent quote prior to part replacement",
      "Standard testing before handoff",
      "90-day warranty on genuine spare parts",
    ],
  },
  cleaning: {
    name: "Home Deep Cleaning",
    description: "Full bathroom sanitation, kitchen degreasing, sofa shampooing, full home sparkle.",
    base_price: 599,
    estimated_duration_minutes: 120,
    features: [
      "Eco-friendly non-toxic cleaning agents",
      "Heavy duty scrubbing and steam sanitation",
      "Tile grout whitening & stain removal",
      "Multi-member trained cleaning crew",
    ],
  },
};

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string) || "electrician";
  const { user, isAuthenticated } = useAuthStore();

  const [categoryInfo, setCategoryInfo] = useState<any>(CATEGORY_MAP[slug] || {
    name: slug.toUpperCase().replace("-", " "),
    description: "Professional on-demand service with verified partners.",
    base_price: 299,
    estimated_duration_minutes: 60,
    features: ["Verified partners", "Transparent pricing", "Warranty guaranteed"],
  });

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<"INSTANT" | "SCHEDULED">("INSTANT");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [problemDescription, setProblemDescription] = useState("");
  const [addressText, setAddressText] = useState("");
  const [geoCoordinates, setGeoCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch availability slots when scheduled date or category changes
  const fetchAvailabilitySlots = useCallback(async (catId: string, dateStr: string) => {
    try {
      setLoadingSlots(true);
      const { data } = await apiClient.get("/bookings/availability-slots/", {
        params: { category_id: catId, date: dateStr },
      });
      if (data && Array.isArray(data.slots)) {
        setAvailableSlots(data.slots);
      }
    } catch (e) {
      // Fallback default slots if not loaded
      setAvailableSlots([
        { time: "09:00", display: "09:00 AM", is_available: true, available_partner_count: 2 },
        { time: "11:00", display: "11:00 AM", is_available: true, available_partner_count: 3 },
        { time: "14:00", display: "02:00 PM", is_available: true, available_partner_count: 1 },
        { time: "16:00", display: "04:00 PM", is_available: true, available_partner_count: 2 },
        { time: "18:00", display: "06:00 PM", is_available: true, available_partner_count: 2 },
      ]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (bookingType === "SCHEDULED" && categoryId && scheduledDate) {
      fetchAvailabilitySlots(categoryId, scheduledDate);
    }
  }, [bookingType, categoryId, scheduledDate, fetchAvailabilitySlots]);

  // Load category from backend & saved addresses if logged in
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Try getting backend category
        const { data: catData } = await apiClient.get(`/services/categories/${slug}/`);
        if (catData) {
          setCategoryInfo((prev: any) => ({
            ...prev,
            ...catData,
            name: catData.name || prev.name,
            base_price: catData.base_price || prev.base_price,
          }));
          setCategoryId(catData.id);
        }
      } catch (e) {
        // Fallback to static
      }

      if (isAuthenticated && user?.role === "CUSTOMER") {
        try {
          const { data: addrData } = await apiClient.get("/locations/addresses/");
          if (Array.isArray(addrData) && addrData.length > 0) {
            setSavedAddresses(addrData);
            const defaultAddr = addrData.find((a: any) => a.is_default) || addrData[0];
            setSelectedAddressId(defaultAddr.id);
            setAddressText(`${defaultAddr.address_line_1}, ${defaultAddr.city} - ${defaultAddr.pincode}`);
          }
        } catch (e) {
          // Address fetch failed
        }
      }
      setLoading(false);
    }
    loadData();
  }, [slug, isAuthenticated, user]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoCoordinates({ lat: latitude, lng: longitude });
        setAddressText(`Detected Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setSelectedAddressId("");
        toast.success("Current GPS location detected!");
        setDetectingLocation(false);
      },
      (err) => {
        toast.error("Could not obtain location. Please enter manually.");
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast("Please sign in or register to book a service.", { icon: "🔒" });
      router.push(`/login?redirect=/services/${slug}`);
      return;
    }

    if (!problemDescription.trim()) {
      toast.error("Please describe the problem you need solved.");
      return;
    }

    if (!addressText.trim() && !selectedAddressId) {
      toast.error("Please provide a service delivery address.");
      return;
    }

    if (bookingType === "SCHEDULED" && (!scheduledDate || !scheduledTime)) {
      toast.error("Please choose a date and time slot for your scheduled booking.");
      return;
    }

    setSubmitting(true);

    try {
      let scheduledAtIso: string | undefined = undefined;
      if (bookingType === "SCHEDULED") {
        scheduledAtIso = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      }

      // If categoryId is missing, attempt to fetch all categories to match slug
      let finalCatId = categoryId;
      if (!finalCatId) {
        try {
          const { data: allCats } = await apiClient.get("/services/categories/");
          const found = allCats.find((c: any) => c.slug === slug);
          if (found) finalCatId = found.id;
        } catch (e) {}
      }

      const payload: any = {
        service_category_id: finalCatId,
        booking_type: bookingType,
        problem_description: problemDescription,
        service_address_id: selectedAddressId || undefined,
        service_address_text: addressText,
        scheduled_at: scheduledAtIso,
        service_latitude: geoCoordinates?.lat || 13.0827,
        service_longitude: geoCoordinates?.lng || 80.2707,
      };

      const res = await apiClient.post("/bookings/", payload);
      const createdBookingId = res.data?.booking_id || res.data?.id;

      toast.success(
        bookingType === "INSTANT"
          ? "Booking initiated! Rapido-matching started for nearby partners."
          : "Service scheduled successfully!"
      );

      // Redirect to real-time live tracking
      if (createdBookingId) {
        router.push(`/bookings/${createdBookingId}`);
      } else {
        router.push("/dashboard/customer");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Could not initiate booking. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-orange-500">Home</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-orange-500">Services</Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{categoryInfo.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Service Details */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shadow-sm">
                  <Wrench className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 font-heading">
                    {categoryInfo.name}
                  </h1>
                  <p className="text-xs text-orange-500 font-semibold mt-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Real-time partner dispatch within 10-15 mins
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-6">
                {categoryInfo.description}
              </p>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-200 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>Duration: ~{categoryInfo.estimated_duration_minutes || 60} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>30-Day Service Guarantee</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Service Inclusions
                </h4>
                <ul className="space-y-2">
                  {(categoryInfo.features || []).map((feat: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* How matching works alert */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 text-xs text-slate-500">
              <HelpCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 mb-1">How Rapido-Style Matching Works:</p>
                <p>
                  Once you tap Confirm, our real-time matching engine broadcasts your request to top-rated nearby partners within your district. The first available partner who accepts is immediately dispatched to your doorstep.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Booking Card Form */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl sticky top-28">
              <h2 className="text-xl font-bold text-slate-900 font-heading mb-4">
                Book This Service
              </h2>

              <form onSubmit={handleBookingSubmit} className="space-y-5">
                {/* Instant vs Scheduled */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    When do you need service?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingType("INSTANT")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                        bookingType === "INSTANT"
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold shadow-md shadow-orange-500/20"
                          : "bg-slate-100 text-slate-500 hover:text-orange-500"
                      }`}
                    >
                      <Zap className="w-4 h-4" /> Instant (Now)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingType("SCHEDULED")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                        bookingType === "SCHEDULED"
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold shadow-md shadow-orange-500/20"
                          : "bg-slate-100 text-slate-500 hover:text-orange-500"
                      }`}
                    >
                      <Calendar className="w-4 h-4" /> Schedule Later
                    </button>
                  </div>
                </div>

                {/* Date & Time if scheduled */}
                {bookingType === "SCHEDULED" && (
                  <div className="space-y-3 p-4 bg-slate-100 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Select Preferred Date
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                          const d = new Date();
                          d.setDate(d.getDate() + offset);
                          const dateIso = d.toISOString().split("T")[0];
                          const isSelected = scheduledDate === dateIso;
                          const dayName = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short" });
                          const dayNum = d.toLocaleDateString([], { month: "short", day: "numeric" });

                          return (
                            <button
                              key={dateIso}
                              type="button"
                              onClick={() => {
                                setScheduledDate(dateIso);
                                setScheduledTime("");
                              }}
                              className={`flex-shrink-0 px-3 py-2 rounded-xl text-center transition border ${
                                isSelected
                                  ? "bg-orange-500 text-slate-950 font-bold border-orange-500 shadow-sm"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-200 hover:text-orange-500"
                              }`}
                            >
                              <span className="block text-[10px] uppercase font-semibold">{dayName}</span>
                              <span className="block text-xs font-mono font-bold mt-0.5">{dayNum}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Select 1-Hour Time Slot
                        </label>
                        {loadingSlots && (
                          <span className="text-[10px] text-white flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Checking partner availability...
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {availableSlots.map((slot) => {
                          const isSelected = scheduledTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.is_available}
                              onClick={() => setScheduledTime(slot.time)}
                              className={`p-2 rounded-xl text-left border transition relative text-xs ${
                                !slot.is_available
                                  ? "bg-white border-slate-200 opacity-40 cursor-not-allowed text-slate-400"
                                  : isSelected
                                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 border-orange-500 font-bold shadow-md shadow-orange-500/20"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{slot.display}</span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    slot.is_available
                                      ? isSelected
                                      : "bg-emerald-400"
                                  }`}
                                />
                              </div>
                              <span className="block text-[9px] mt-0.5 opacity-80">
                                {slot.is_available
                                  ? `${slot.available_partner_count} pros free`
                                  : "Booked"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Problem Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Describe the issue
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="e.g. Ceiling fan not spinning at full speed, sparks observed in regulator switch..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                {/* Address Selection with GPS detection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Service Location
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      className="text-[11px] text-white hover:text-slate-800 flex items-center gap-1 font-semibold"
                    >
                      {detectingLocation ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Detecting GPS...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3" /> Use Current GPS
                        </>
                      )}
                    </button>
                  </div>

                  {savedAddresses.length > 0 ? (
                    <div className="space-y-2 mb-2">
                      <select
                        value={selectedAddressId}
                        onChange={(e) => {
                          setSelectedAddressId(e.target.value);
                          const addr = savedAddresses.find((a) => a.id === e.target.value);
                          if (addr) {
                            setAddressText(`${addr.address_line_1}, ${addr.city} - ${addr.pincode}`);
                            if (addr.latitude && addr.longitude) {
                              setGeoCoordinates({ lat: addr.latitude, lng: addr.longitude });
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        {savedAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.label}: {addr.address_line_1}, {addr.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={addressText}
                        onChange={(e) => setAddressText(e.target.value)}
                        placeholder="House / Flat no, Street name, City, Pincode"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  )}
                </div>


                {/* Price Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Inspection Charge</span>
                    <span className="text-slate-900 font-bold">₹{categoryInfo.base_price}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Convenience Fee</span>
                    <span className="text-emerald-600 font-bold">₹0 (100% Free)</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Total Service Amount</span>
                    <span className="text-orange-500 font-black">₹{categoryInfo.base_price}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic pt-1">
                    * 100% Free Platform. Settle directly with the technician via Cash or UPI upon service completion.
                  </p>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting to Partners...</span>
                    </>
                  ) : (
                    <>
                      <span>{bookingType === "INSTANT" ? "Book & Find Nearby Pro" : "Confirm Schedule"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
