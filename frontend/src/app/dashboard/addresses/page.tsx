"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Trash2,
  CheckCircle,
  Home,
  Briefcase,
  Star,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";
import apiClient from "@/lib/api-client";
import type { ServiceAddress } from "@/types";

const TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
  "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris (Ooty)",
  "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai",
  "Tenkasi", "Thanjavur", "Theni", "Thoothukudi (Tuticorin)", "Tiruchirappalli (Trichy)",
  "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
  "Vellore", "Viluppuram", "Virudhunagar"
];

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<ServiceAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const [formData, setFormData] = useState({
    label: "Home",
    address_line_1: "",
    address_line_2: "",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600040",
    is_default: true,
    latitude: 13.0827,
    longitude: 80.2707,
  });

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
          address_line_2: prev.address_line_2 || `GPS Pin: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        }));
        toast.success("GPS coordinates detected & pinned!");
        setDetectingGps(false);
      },
      () => {
        toast.error("Could not obtain GPS location.");
        setDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/locations/addresses/");
      const items = Array.isArray(data) ? data : (data?.results || []);
      setAddresses(items);
    } catch (e) {
      // Mock fallback for UI preview
      setAddresses([
        {
          id: "addr-1",
          label: "Home",
          address_line_1: "Flat 4B, Emerald Heights, Anna Nagar",
          address_line_2: "Near Roundtana",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600040",
          country: "India",
          latitude: 13.0827,
          longitude: 80.2707,
          is_default: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post("/locations/addresses/", formData);
      toast.success("Address saved successfully!");
      setShowForm(false);
      fetchAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save address.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      await apiClient.delete(`/locations/addresses/${id}/`);
      toast.success("Address removed.");
      fetchAddresses();
    } catch (err) {
      toast.error("Failed to delete address.");
    }
  };

  return (
    <AuthGuard allowedRoles={["CUSTOMER"]}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 mb-8 border-b border-slate-200">
            <div>
              <Link
                href="/dashboard/customer"
                className="inline-flex items-center gap-1.5 text-xs text-orange-500 hover:underline mb-2 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
              <h1 className="text-3xl font-black text-slate-900 font-heading">
                Saved Service Addresses
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Your saved locations for swift instant booking matching
              </p>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Address"}
            </button>
          </div>

          {/* New Address Form */}
          {showForm && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Add New Delivery Location
                </h2>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={detectingGps}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition"
                >
                  {detectingGps ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Detect My Location</span>
                    </>
                  )}
                </button>
              </div>

              <form onSubmit={handleCreateAddress} className="space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                      Address Label
                    </label>
                    <select
                      name="label"
                      value={formData.label}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work / Office</option>
                      <option value="Rental Property">Rental Property</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      required
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="600040"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Address Line 1 (Flat / House / Building / Street)
                  </label>
                  <input
                    type="text"
                    name="address_line_1"
                    required
                    value={formData.address_line_1}
                    onChange={handleChange}
                    placeholder="e.g. Flat 4B, Emerald Heights, Anna Nagar"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Address Line 2 (Landmark / Area - Optional)
                  </label>
                  <input
                    type="text"
                    name="address_line_2"
                    value={formData.address_line_2}
                    onChange={handleChange}
                    placeholder="e.g. Near Roundtana Signal"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                      District / City (Tamil Nadu)
                    </label>
                    <input
                      type="text"
                      name="city"
                      list="tn-districts-list"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Chennai, Coimbatore, Madurai"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <datalist id="tn-districts-list">
                      {TN_DISTRICTS.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Tamil Nadu"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-white focus:ring-blue-500"
                  />
                  <label htmlFor="is_default" className="text-xs text-slate-700">
                    Set as my primary default service address
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 bg-slate-100 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold transition shadow-md shadow-orange-500/20"
                  >
                    {submitting ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Address List */}
          {loading ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading saved addresses...</p>
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 mb-1">No addresses saved yet</h3>
              <p className="text-xs text-slate-500 mb-4">
                Add your home or work address for faster one-tap booking.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold"
              >
                Add Your First Address
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white/95 border border-slate-200 rounded-2xl p-5 hover:border-slate-200 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 flex-shrink-0 mt-0.5">
                      {addr.label === "Home" ? (
                        <Home className="w-5 h-5" />
                      ) : (
                        <Briefcase className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{addr.label}</h4>
                        {addr.is_default && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 mt-1">
                        {addr.address_line_1}
                        {addr.address_line_2 ? `, ${addr.address_line_2}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
