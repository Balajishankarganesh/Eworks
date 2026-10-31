"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  IndianRupee,
  Check,
  X,
  FileText,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Layers,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"ANALYTICS" | "PARTNERS" | "CATEGORIES" | "TICKETS">("ANALYTICS");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics states
  const [metrics, setMetrics] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  // Partners states
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>("ALL");
  const [partnerActionLoading, setPartnerActionLoading] = useState<string | null>(null);

  // Categories states
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatModalOpen, setNewCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatPrice, setNewCatPrice] = useState("199");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Support & Dispute Tickets states
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState<string>("OPEN");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvingTicket, setResolvingTicket] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    try {
      const { data } = await apiClient.get("/support/admin/analytics/");
      setMetrics(data.metrics);
      setRecentBookings(data.recent_bookings || []);
    } catch (e) {
      // Demo fallback metrics
      setMetrics({
        gmv: 48920.0,
        platform_revenue: 7338.0,
        partner_payouts: 41582.0,
        pending_payouts: 5640.0,
        total_bookings: 142,
        completed_bookings: 118,
        active_bookings: 14,
        cancelled_bookings: 6,
        no_partners_bookings: 4,
        total_customers: 284,
        total_partners: 38,
        approved_partners: 29,
        pending_partners: 7,
        online_partners: 16,
        open_tickets: 3,
        resolved_tickets: 22,
      });
      setRecentBookings([
        {
          id: "bk-9941",
          category: "Electrician",
          customer_name: "Priya Sharma",
          partner_name: "Ramesh Kumar",
          status: "IN_PROGRESS",
          amount: 349.0,
          created_at: new Date().toISOString(),
        },
        {
          id: "bk-9940",
          category: "Plumbing",
          customer_name: "Vikas Menon",
          partner_name: "Suresh Babu",
          status: "COMPLETED",
          amount: 499.0,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ]);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data } = await apiClient.get("/auth/admin/partners/");
      if (Array.isArray(data)) {
        setPartners(data);
      } else if (data?.results && Array.isArray(data.results)) {
        setPartners(data.results);
      }
    } catch (e) {
      // Fallback demo partners
      setPartners([
        {
          id: "part-1",
          user: {
            id: "u-1",
            first_name: "Vikram",
            last_name: "Singh",
            email: "vikram.singh@example.com",
            phone: "+91 98765 43210",
          },
          status: "PENDING",
          years_of_experience: 6,
          id_proof_number: "AADHAAR-8839-2910-4491",
          bio: "Certified licensed electrician with over 6 years residential wiring experience.",
          is_online: false,
          total_jobs_completed: 0,
          average_rating: 0.0,
          verifications: [
            { id: "v-1", document_type: "GOVT_ID", is_verified: false, document_file: "#" },
            { id: "v-2", document_type: "TRADE_CERTIFICATE", is_verified: false, document_file: "#" },
          ],
        },
        {
          id: "part-2",
          user: {
            id: "u-2",
            first_name: "Manoj",
            last_name: "Patel",
            email: "manoj.patel@example.com",
            phone: "+91 91234 56789",
          },
          status: "APPROVED",
          years_of_experience: 8,
          id_proof_number: "PAN-ABCDE1234F",
          bio: "Master plumber specializing in high-pressure water pumps and pipe fittings.",
          is_online: true,
          total_jobs_completed: 42,
          average_rating: 4.9,
          verifications: [
            { id: "v-3", document_type: "GOVT_ID", is_verified: true, document_file: "#" },
          ],
        },
      ]);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await apiClient.get("/services/categories/");
      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data?.results && Array.isArray(data.results)) {
        setCategories(data.results);
      }
    } catch (e) {
      setCategories([
        { id: "cat-1", name: "Electrician", slug: "electrician", base_price: 199.0, is_active: true },
        { id: "cat-2", name: "Plumber", slug: "plumber", base_price: 249.0, is_active: true },
        { id: "cat-3", name: "AC Repair & Service", slug: "ac-repair", base_price: 499.0, is_active: true },
        { id: "cat-4", name: "Carpentry", slug: "carpentry", base_price: 299.0, is_active: true },
      ]);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data } = await apiClient.get("/support/tickets/");
      if (Array.isArray(data)) {
        setTickets(data);
      } else if (data?.results && Array.isArray(data.results)) {
        setTickets(data.results);
      }
    } catch (e) {
      setTickets([
        {
          id: "tick-1",
          category: "BOOKING_ISSUE",
          subject: "Technician arrived 20 minutes late",
          description: "Technician encountered traffic and had minor delays on booking #bk-9940.",
          status: "OPEN",
          raised_by_email: "priya.sharma@example.com",
          raised_by_name: "Priya Sharma",
          booking_reference: "#bk-9940 - Electrician",
          created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
          resolution_notes: "",
        },
        {
          id: "tick-2",
          category: "PAYMENT_ISSUE",
          subject: "Payment debited twice via UPI",
          description: "Bank showed two debit alerts of ₹349 for instant booking.",
          status: "RESOLVED",
          raised_by_email: "vikas.menon@example.com",
          raised_by_name: "Vikas Menon",
          booking_reference: "#bk-9938 - Plumbing",
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          resolution_notes: "Auto-refund of redundant transaction initiated via gateway.",
        },
      ]);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await apiClient.get("/support/admin/audit-logs/");
      if (Array.isArray(data)) setAuditLogs(data);
      else if (data?.results) setAuditLogs(data.results);
    } catch (e) {
      // Ignore
    }
  };

  const loadAllData = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    await Promise.allSettled([
      fetchAnalytics(),
      fetchPartners(),
      fetchCategories(),
      fetchTickets(),
      fetchAuditLogs(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Partner Moderation Actions
  const handleApprovePartner = async (partnerId: string) => {
    try {
      setPartnerActionLoading(partnerId);
      await apiClient.post(`/auth/admin/partners/${partnerId}/approve/`);
      toast.success("Partner verified and approved!");
      setPartners((prev) =>
        prev.map((p) => (p.id === partnerId ? { ...p, status: "APPROVED" } : p))
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to approve partner.");
    } finally {
      setPartnerActionLoading(null);
    }
  };

  const handleRejectPartner = async (partnerId: string) => {
    const reason = window.prompt("Reason for rejecting or suspending this partner:");
    if (!reason) return;

    try {
      setPartnerActionLoading(partnerId);
      await apiClient.post(`/auth/admin/partners/${partnerId}/reject/`, {
        rejection_reason: reason,
      });
      toast("Partner application rejected.", { icon: "🚫" });
      setPartners((prev) =>
        prev.map((p) => (p.id === partnerId ? { ...p, status: "REJECTED" } : p))
      );
    } catch (e: any) {
      toast.error("Failed to reject partner.");
    } finally {
      setPartnerActionLoading(null);
    }
  };

  // Add Category Action
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) {
      toast.error("Name and Slug are required.");
      return;
    }

    try {
      setSavingCategory(true);
      const { data } = await apiClient.post("/services/categories/admin/", {
        name: newCatName,
        slug: newCatSlug.toLowerCase().replace(/\s+/g, "-"),
        base_price: parseFloat(newCatPrice) || 199.0,
        description: newCatDesc,
        is_active: true,
      });

      toast.success(`Service category '${newCatName}' created!`);
      setCategories((prev) => [data, ...prev]);
      setNewCatModalOpen(false);
      setNewCatName("");
      setNewCatSlug("");
      setNewCatDesc("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create category.");
    } finally {
      setSavingCategory(false);
    }
  };

  // Resolve Ticket Action
  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      setResolvingTicket(true);
      await apiClient.patch(`/support/tickets/${selectedTicket.id}/`, {
        status: "RESOLVED",
        resolution_notes: resolutionNotes,
      });
      toast.success("Ticket marked as Resolved!");
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, status: "RESOLVED", resolution_notes: resolutionNotes }
            : t
        )
      );
      setSelectedTicket(null);
      setResolutionNotes("");
    } catch (err: any) {
      toast.error("Failed to update ticket.");
    } finally {
      setResolvingTicket(false);
    }
  };

  const filteredPartners = partners.filter((p) => {
    if (partnerStatusFilter === "ALL") return true;
    return p.status === partnerStatusFilter;
  });

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === "ALL") return true;
    if (ticketFilter === "OPEN") return ["OPEN", "IN_PROGRESS"].includes(t.status);
    return t.status === ticketFilter;
  });

  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-xl shadow-orange-500/20">
                <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                    Admin Command Center
                  </h1>
                  <span className="px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wider">
                    Superuser
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Global operations oversight, partner verification queue, dispute resolution, and marketplace GMV analytics.
                </p>
              </div>
            </div>

            <button
              onClick={() => loadAllData(false)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs flex items-center gap-2 self-start md:self-auto transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-white" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab("ANALYTICS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === "ANALYTICS"
                  ? "bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Platform Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab("PARTNERS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === "PARTNERS"
                  ? "bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Partner Moderation ({partners.filter((p) => p.status === "PENDING").length} Pending)</span>
            </button>
            <button
              onClick={() => setActiveTab("CATEGORIES")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === "CATEGORIES"
                  ? "bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Service Categories ({categories.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("TICKETS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === "TICKETS"
                  ? "bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Support & Disputes ({tickets.filter((t) => t.status === "OPEN").length} Open)</span>
            </button>
          </div>

          {/* TAB 1: ANALYTICS & GMV METRICS */}
          {activeTab === "ANALYTICS" && (
            <div className="space-y-8">
              {/* 4 Main Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Total Gross GMV</p>
                  <p className="text-3xl font-black text-slate-900 font-mono">
                    ₹{metrics?.gmv?.toLocaleString("en-IN") || "0"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Total customer booking spend</p>
                </div>

                <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-slate-200 rounded-3xl p-6 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Platform Cut (15%)</p>
                  <p className="text-3xl font-black text-amber-300 font-mono">
                    ₹{metrics?.platform_revenue?.toLocaleString("en-IN") || "0"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Retained platform net earnings</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Total Bookings</p>
                  <p className="text-3xl font-black text-slate-900 font-mono">{metrics?.total_bookings || 0}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">
                    {metrics?.completed_bookings || 0} completed successfully
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Active Pros On Duty</p>
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    {metrics?.online_partners || 0} / {metrics?.total_partners || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {metrics?.approved_partners || 0} approved • {metrics?.pending_partners || 0} pending review
                  </p>
                </div>
              </div>

              {/* Status Breakdown & Operational Pulse */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Booking Status Breakdown</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-emerald-400 font-medium">Completed Jobs</span>
                      <span className="font-mono font-bold text-slate-900">{metrics?.completed_bookings || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-700 font-medium">Active (En Route / In Progress)</span>
                      <span className="font-mono font-bold text-slate-900">{metrics?.active_bookings || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-rose-400 font-medium">Cancelled</span>
                      <span className="font-mono font-bold text-slate-900">{metrics?.cancelled_bookings || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-amber-400 font-medium">No Partners (Timed Out)</span>
                      <span className="font-mono font-bold text-slate-900">{metrics?.no_partners_bookings || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">User Directory</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-700">Registered Customers</span>
                      <span className="font-mono font-bold text-slate-900">{metrics?.total_customers || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-700">Approved Service Partners</span>
                      <span className="font-mono font-bold text-emerald-400">{metrics?.approved_partners || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-700">Pending Verification</span>
                      <span className="font-mono font-bold text-amber-400">{metrics?.pending_partners || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-700">Open Support Tickets</span>
                      <span className="font-mono font-bold text-rose-400">{metrics?.open_tickets || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Settlements & Escrow</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-700">Partner Net Disbursed</span>
                      <span className="font-mono font-bold text-white">₹{metrics?.partner_payouts?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-700">Pending Partner Claims</span>
                      <span className="font-mono font-bold text-amber-400">₹{metrics?.pending_payouts?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-700">Platform Cut Rate</span>
                      <span className="font-mono font-bold text-emerald-400">15.0% Standard</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Bookings Feed */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
                <h3 className="text-base font-bold text-slate-900 mb-4">Latest Platform Bookings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-black/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Booking ID</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Assigned Partner</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {recentBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-100 transition">
                          <td className="py-3 px-4 font-mono font-bold text-white">#{b.id.slice(0, 8)}</td>
                          <td className="py-3 px-4">{b.category}</td>
                          <td className="py-3 px-4">{b.customer_name}</td>
                          <td className="py-3 px-4">{b.partner_name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            ₹{b.amount?.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/bookings/${b.id}`}
                              className="text-white hover:text-slate-800 font-semibold"
                            >
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTNER VERIFICATION & MODERATION */}
          {activeTab === "PARTNERS" && (
            <div className="space-y-6">
              {/* Filter tabs */}
              <div className="flex items-center gap-2">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPartnerStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      partnerStatusFilter === st
                        ? "bg-orange-500 text-slate-950 font-bold border border-orange-500 shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Partners Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPartners.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">
                              {p.user?.first_name} {p.user?.last_name || ""}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                p.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : p.status === "PENDING"
                                  ? "bg-white/5 text-amber-400 border-slate-200"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{p.user?.email} • {p.user?.phone}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-black/70 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-700 mb-3">
                        <p><span className="text-slate-400 font-semibold">Experience:</span> {p.years_of_experience} years</p>
                        <p><span className="text-slate-400 font-semibold">Govt ID Proof:</span> {p.id_proof_number || "Not provided"}</p>
                        {p.bio && <p className="text-[11px] text-slate-500 italic">"{p.bio}"</p>}
                      </div>

                      {/* Documents submitted */}
                      {p.verifications && p.verifications.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Submitted Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {p.verifications.map((v: any) => (
                              <span
                                key={v.id}
                                className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] text-slate-700 border border-slate-200 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3 text-white" />
                                {v.document_type.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Moderation Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                      {p.status !== "APPROVED" && (
                        <button
                          onClick={() => handleApprovePartner(p.id)}
                          disabled={partnerActionLoading === p.id}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5"
                        >
                          {partnerActionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>Approve & Verify</span>
                        </button>
                      )}

                      {p.status !== "REJECTED" && (
                        <button
                          onClick={() => handleRejectPartner(p.id)}
                          disabled={partnerActionLoading === p.id}
                          className="flex-1 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Reject / Suspend</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SERVICE CATEGORIES MANAGEMENT */}
          {activeTab === "CATEGORIES" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Active Catalog Services</h3>
                <button
                  onClick={() => setNewCatModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{c.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">/{c.slug}</p>
                      {c.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{c.description}</p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Base Fare:</span>
                      <span className="font-bold font-mono text-emerald-400">₹{c.base_price || 199.0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SUPPORT & DISPUTE TICKETS */}
          {activeTab === "TICKETS" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                {["OPEN", "RESOLVED", "ALL"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setTicketFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      ticketFilter === st
                        ? "bg-orange-500 text-slate-950 font-bold border border-orange-500 shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {st === "OPEN" ? "Open Disputes" : st === "RESOLVED" ? "Resolved" : "All Tickets"}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status === "RESOLVED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-white/5 text-amber-400 border-slate-200"
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-xs font-bold text-white">{t.subject}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Raised by {t.raised_by_name} ({t.raised_by_email}) {t.booking_reference ? `• ${t.booking_reference}` : ""}
                      </p>
                      <p className="text-xs text-slate-700 mt-2 bg-black/60 p-3 rounded-xl border border-slate-200">
                        {t.description}
                      </p>
                      {t.resolution_notes && (
                        <p className="text-[11px] text-emerald-400 mt-1">
                          Resolution: {t.resolution_notes}
                        </p>
                      )}
                    </div>

                    {t.status !== "RESOLVED" && (
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setResolutionNotes("");
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs transition shrink-0 shadow-md shadow-orange-500/20"
                      >
                        Resolve Dispute
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Add Category Modal */}
        {newCatModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Create Service Category</h3>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      if (!newCatSlug) setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    }}
                    placeholder="e.g. Appliance Repair"
                    className="w-full bg-black border border-slate-200 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="appliance-repair"
                    className="w-full bg-black border border-slate-200 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Base Price (INR)</label>
                  <input
                    type="number"
                    value={newCatPrice}
                    onChange={(e) => setNewCatPrice(e.target.value)}
                    className="w-full bg-black border border-slate-200 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-black border border-slate-200 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setNewCatModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCategory}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-orange-500/20"
                  >
                    {savingCategory ? "Saving..." : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Resolve Ticket Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Resolve Dispute Ticket</h3>
              <p className="text-xs text-slate-500 mb-4">
                Enter the official resolution action (e.g. refund issued, customer contacted, partner warned).
              </p>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder="Resolution details..."
                className="w-full bg-black border border-slate-200 rounded-xl p-3 text-xs text-white mb-4"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveTicket}
                  disabled={resolvingTicket}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
                >
                  {resolvingTicket ? "Resolving..." : "Confirm Resolution"}
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </AuthGuard>
  );
}
