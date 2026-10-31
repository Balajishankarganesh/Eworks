"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Wrench,
  User as UserIcon,
  LogOut,
  MapPin,
  Calendar,
  Briefcase,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Zap,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNotificationsWebSocket } from "@/hooks/useWebSockets";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Real-time notifications WebSocket hook
  const {
    isConnected: isWsConnected,
    unreadCount,
    notifications,
    loading: notificationsLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationsWebSocket();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    setNotificationsOpen(false);
    router.push("/login");
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setNotificationsOpen(false);

    if (notif.data?.booking_id) {
      if (user?.role === "PARTNER" && notif.notification_type === "NEW_OFFER") {
        router.push("/dashboard/partner");
      } else if (user?.role === "PARTNER") {
        router.push(`/dashboard/partner/job/${notif.data.booking_id}`);
      } else {
        router.push(`/bookings/${notif.data.booking_id}`);
      }
    }
  };

  const isAuth = mounted && isAuthenticated;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg"
          : "bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
              <Wrench className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white font-heading">E<span className="text-orange-500">works</span></span>
              <span className="text-[10px] text-slate-400 font-medium -mt-1 tracking-wider uppercase">
                Hyperlocal Services
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/services"
              className={`text-sm font-medium transition-colors hover:text-orange-400 ${
                pathname === "/services" ? "text-orange-400 font-bold" : "text-slate-300"
              }`}
            >
              Services
            </Link>
            <Link
              href="/#how-it-works"
              className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors"
            >
              How It Works
            </Link>
            {!isAuth && (
              <Link
                href="/register/partner"
                className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4 text-slate-400" />
                Become a Partner
              </Link>
            )}

            {isAuth && user?.role === "CUSTOMER" && (
              <>
                <Link
                  href="/dashboard/customer"
                  className={`text-sm font-medium transition-colors hover:text-orange-400 flex items-center gap-1.5 ${
                    pathname === "/dashboard/customer" ? "text-orange-400 font-bold" : "text-slate-300"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  My Bookings
                </Link>
                <Link
                  href="/dashboard/addresses"
                  className={`text-sm font-medium transition-colors hover:text-orange-400 flex items-center gap-1.5 ${
                    pathname === "/dashboard/addresses" ? "text-orange-400 font-bold" : "text-slate-300"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Addresses
                </Link>
              </>
            )}

            {isAuth && user?.role === "PARTNER" && (
              <Link
                href="/dashboard/partner"
                className={`text-sm font-medium transition-colors hover:text-orange-400 flex items-center gap-1.5 ${
                  pathname === "/dashboard/partner" ? "text-orange-400 font-bold" : "text-slate-300"
                }`}
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                Partner Portal
              </Link>
            )}

            {isAuth && (user?.role === "ADMIN" || user?.is_staff) && (
              <Link
                href="/dashboard/admin"
                className={`text-sm font-medium transition-colors hover:text-orange-400 flex items-center gap-1.5 ${
                  pathname === "/dashboard/admin" ? "text-orange-400 font-bold" : "text-slate-300"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Admin Console
              </Link>
            )}
          </div>

          {/* Desktop CTA / Auth / Notifications */}
          <div className="hidden md:flex items-center gap-4">
            {!isAuth ? (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-orange-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register/customer"
                  className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all duration-200"
                >
                  Book a Service
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* Real-time Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setUserDropdownOpen(false);
                      if (!notificationsOpen) fetchNotifications();
                    }}
                    aria-label="Open notifications"
                    className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-orange-400 transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-slate-950 shadow-md shadow-orange-500/20 animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 pb-2.5 mb-1 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                        {notificationsLoading && notifications.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                          <div className="py-8 text-center px-4">
                            <Sparkles className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-300">You're all caught up!</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">No notifications right now.</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3 hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3 ${
                                !n.is_read ? "bg-orange-500/5" : ""
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  n.notification_type === "NEW_OFFER"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : n.notification_type === "BOOKING_MATCHED"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {n.notification_type === "NEW_OFFER" ? (
                                  <Zap className="w-3.5 h-3.5" />
                                ) : n.notification_type === "BOOKING_MATCHED" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-bold text-white truncate">{n.title}</p>
                                  {!n.is_read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                  {n.body}
                                </p>
                                <span className="text-[10px] text-slate-500 mt-1 block">
                                  {new Date(n.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(!userDropdownOpen);
                      setNotificationsOpen(false);
                    }}
                    className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold text-sm">
                      {user?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-xs font-bold text-white leading-tight">
                        {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : user?.email}
                      </p>
                      <span className="text-[10px] uppercase font-semibold text-orange-400">
                        {user?.role}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-slate-800">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-xs font-semibold text-white truncate">{user?.email}</p>
                      </div>

                      {user?.role === "CUSTOMER" && (
                        <>
                          <Link
                            href="/dashboard/customer"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-orange-400"
                          >
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Customer Dashboard
                          </Link>
                          <Link
                            href="/dashboard/addresses"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-orange-400"
                          >
                            <MapPin className="w-4 h-4 text-slate-400" />
                            Manage Addresses
                          </Link>
                        </>
                      )}

                      {user?.role === "PARTNER" && (
                        <Link
                          href="/dashboard/partner"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-orange-400"
                        >
                          <Zap className="w-4 h-4 text-emerald-400" />
                          Partner Portal
                        </Link>
                      )}

                      {(user?.role === "ADMIN" || user?.is_staff) && (
                        <Link
                          href="/dashboard/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-orange-400"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          Admin Console
                        </Link>
                      )}

                      <div className="border-t border-slate-800 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuth && (
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  if (!notificationsOpen) fetchNotifications();
                }}
                className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-orange-400"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-orange-500 text-slate-950 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-orange-400"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-6 py-6 space-y-4">
          <Link
            href="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-300 hover:text-orange-400"
          >
            Services
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-300 hover:text-orange-400"
          >
            How It Works
          </Link>

          {!isAuth ? (
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center text-sm font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800"
              >
                Sign In
              </Link>
              <Link
                href="/register/customer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center text-sm font-semibold text-slate-950 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-bold rounded-xl"
              >
                Sign Up as Customer
              </Link>
              <Link
                href="/register/partner"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center text-sm font-semibold text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 rounded-xl"
              >
                Join as Partner
              </Link>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              <div className="px-2 py-1">
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="text-sm font-bold text-white">{user?.email}</p>
                <span className="text-[10px] uppercase font-bold text-orange-400">Role: {user?.role}</span>
              </div>
              {user?.role === "CUSTOMER" && (
                <>
                  <Link
                    href="/dashboard/customer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-sm font-medium text-slate-300 hover:text-orange-400"
                  >
                    My Bookings
                  </Link>
                  <Link
                    href="/dashboard/addresses"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-sm font-medium text-slate-300 hover:text-orange-400"
                  >
                    Manage Addresses
                  </Link>
                </>
              )}
              {user?.role === "PARTNER" && (
                <Link
                  href="/dashboard/partner"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Partner Dashboard
                </Link>
              )}
              {(user?.role === "ADMIN" || user?.is_staff) && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-sm font-medium text-slate-300 hover:text-orange-400 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Admin Console
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full py-3 mt-2 text-center text-sm font-bold text-rose-400 bg-rose-500/10 rounded-xl"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
