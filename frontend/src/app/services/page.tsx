"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  Search,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  Flame,
  Star,
  Users,
  CheckCircle,
  MapPin,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import apiClient from "@/lib/api-client";
import type { ServiceCategory } from "@/types";

// Fallback category data if backend is not currently running
const DEFAULT_CATEGORIES = [
  {
    id: "1",
    name: "Electrician",
    slug: "electrician",
    description: "Wiring, switchboards, short circuit repairs, ceiling fan installations, fuse repairs.",
    icon: "zap",
    base_price: 199,
    estimated_duration_minutes: 45,
    popular: true,
  },
  {
    id: "2",
    name: "Plumber",
    slug: "plumber",
    description: "Pipe leakages, tap repair, bathroom fittings, water motor setup, drainage unclogging.",
    icon: "droplet",
    base_price: 249,
    estimated_duration_minutes: 60,
    popular: true,
  },
  {
    id: "3",
    name: "AC Repair & Service",
    slug: "ac-repair",
    description: "Deep jet cleaning, gas charging, cooling issue diagnosis, compressor service.",
    icon: "wind",
    base_price: 499,
    estimated_duration_minutes: 90,
    popular: true,
  },
  {
    id: "4",
    name: "Carpenter",
    slug: "carpenter",
    description: "Furniture assembly, door hinges, lock installations, custom wooden repair.",
    icon: "hammer",
    base_price: 299,
    estimated_duration_minutes: 60,
    popular: false,
  },
  {
    id: "5",
    name: "Appliance Repair",
    slug: "appliance-repair",
    description: "Washing machine, refrigerator, microwave oven, and water purifier diagnostics.",
    icon: "cpu",
    base_price: 349,
    estimated_duration_minutes: 75,
    popular: true,
  },
  {
    id: "6",
    name: "Home Deep Cleaning",
    slug: "cleaning",
    description: "Full bathroom sanitation, kitchen degreasing, sofa shampooing, full home sparkle.",
    icon: "sparkles",
    base_price: 599,
    estimated_duration_minutes: 120,
    popular: false,
  },
];

const TN_HUBS = [
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  { name: "Trichy", lat: 10.7905, lng: 78.7047 },
  { name: "Salem", lat: 11.6643, lng: 78.1460 },
  { name: "Tiruppur", lat: 11.1085, lng: 77.3411 },
  { name: "Erode", lat: 11.3410, lng: 77.7172 },
  { name: "Tirunelveli", lat: 8.7139, lng: 77.7567 },
  { name: "Vellore", lat: 12.9165, lng: 79.1325 },
  { name: "Thanjavur", lat: 10.7870, lng: 79.1378 },
  { name: "Kanyakumari", lat: 8.1833, lng: 77.4119 },
];

export default function ServicesPage() {
  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Geo-search state
  const [searchingGeo, setSearchingGeo] = useState(false);
  const [geoSearched, setGeoSearched] = useState(false);
  const [nearbyPartners, setNearbyPartners] = useState<any[]>([]);
  const [userLocationLabel, setUserLocationLabel] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("Chennai");

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/services/categories/");
        const items = Array.isArray(data) ? data : (data?.results || []);
        if (items.length > 0) {
          setCategories(items);
        }
      } catch (err) {
        // Fallback to default categories
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const handleScanArea = () => {
    if (!navigator.geolocation) {
      scanWithCoords(13.0827, 80.2707, "Chennai Hub (Tamil Nadu)");
      return;
    }

    setSearchingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        scanWithCoords(latitude, longitude, `Your Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
      },
      () => {
        // Default to selected district or Chennai hub
        const hub = TN_HUBS.find((h) => h.name === selectedDistrict) || TN_HUBS[0];
        scanWithCoords(hub.lat, hub.lng, `${hub.name} Hub (Tamil Nadu)`);
      },
      { timeout: 8000 }
    );
  };

  const handleSelectDistrict = (hub: { name: string; lat: number; lng: number }) => {
    setSelectedDistrict(hub.name);
    scanWithCoords(hub.lat, hub.lng, `${hub.name} Hub (Tamil Nadu)`);
  };

  const scanWithCoords = async (lat: number, lng: number, label: string) => {
    try {
      setSearchingGeo(true);
      setUserLocationLabel(label);
      const { data } = await apiClient.get("/locations/geo-search/partners/", {
        params: { latitude: lat, longitude: lng, radius_km: 15 },
      });
      if (data && Array.isArray(data.partners)) {
        setNearbyPartners(data.partners);
      }
      setGeoSearched(true);
    } catch (e) {
      // Mock demo pros if backend offline
      setNearbyPartners([
        {
          id: "p1",
          name: "Suresh R.",
          rating: 4.9,
          total_jobs_completed: 42,
          distance_km: 1.4,
          eta_minutes: 6,
          is_online: true,
          services: [{ category_name: "Electrician" }, { category_name: "Appliance Repair" }],
        },
        {
          id: "p2",
          name: "Vignesh K.",
          rating: 4.8,
          total_jobs_completed: 29,
          distance_km: 2.8,
          eta_minutes: 10,
          is_online: true,
          services: [{ category_name: "Plumber" }],
        },
        {
          id: "p3",
          name: "Muthu Kumar",
          rating: 5.0,
          total_jobs_completed: 64,
          distance_km: 3.5,
          eta_minutes: 14,
          is_online: true,
          services: [{ category_name: "AC Repair & Service" }],
        },
      ]);
      setGeoSearched(true);
    } finally {
      setSearchingGeo(false);
    }
  };

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
        {/* Header & Search */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>RAPIDO-STYLE REAL-TIME MATCHING</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-heading">
            On-Demand Home Services
          </h1>
          <p className="text-base text-slate-500">
            Book trusted, background-verified professionals in your neighborhood. Real-time partner assignment with upfront transparent pricing.
          </p>

          {/* Search Bar + Geo Scanner Button */}
          <div className="pt-4 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search electrician, plumber, AC service, carpenter..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm text-sm"
              />
            </div>

            <button
              onClick={handleScanArea}
              disabled={searchingGeo}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 flex-shrink-0"
            >
              {searchingGeo ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Scanning GPS...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Scan Nearby Pros</span>
                </>
              )}
            </button>
          </div>

          {/* Quick District Hub selector for Tamil Nadu */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-4xl mx-auto">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" /> Tamil Nadu Hubs:
            </span>
            {TN_HUBS.map((hub) => (
              <button
                key={hub.name}
                type="button"
                onClick={() => handleSelectDistrict(hub)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                  selectedDistrict === hub.name && geoSearched
                    ? "bg-orange-500 text-slate-950 border-orange-500 font-bold shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {hub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live Geo Proximity Radar Results */}
        {geoSearched && (
          <div className="mb-12 bg-white/95 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Live Pros Near {userLocationLabel || "Your Area"}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                  {nearbyPartners.length} Active Now
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Average dispatch arrival: <span className="text-slate-900 font-bold">10-15 mins</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyPartners.map((pro) => (
                <div
                  key={pro.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-bold text-sm flex items-center justify-center shadow">
                      {pro.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{pro.name}</p>
                      <p className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                        ★ {pro.rating} <span className="text-slate-400 font-normal">({pro.total_jobs_completed || 20}+ jobs)</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {pro.services?.map((s: any) => s.category_name).join(", ") || "General Services"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-400 block font-mono">
                      ~{pro.eta_minutes || 8}m away
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {pro.distance_km || 1.5} km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cat) => (
            <div
              key={cat.id || cat.slug}
              className="group relative bg-white hover:bg-white border border-slate-200 hover:border-orange-400 rounded-3xl p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-slate-200 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Wrench className="w-7 h-7" />
                  </div>
                  {cat.popular && (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <Flame className="w-3 h-3" /> Popular
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 group-hover:text-orange-500 transition-colors font-heading mb-2">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-6">
                  {cat.description}
                </p>
              </div>

              <div>
                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-slate-500 py-3 border-t border-slate-200 mb-5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    ~{cat.estimated_duration_minutes || 60} mins
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Starts from</span>
                    <span className="text-base font-extrabold text-orange-500">
                      ₹{cat.base_price}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/services/${cat.slug}`}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-orange-500/20"
                >
                  <span>Book Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <p className="text-slate-500 text-sm">No services match &quot;{searchQuery}&quot;.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs font-semibold text-orange-500 hover:underline"
            >
              Clear search filter
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
