"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketClient } from "@/lib/websocket";
import apiClient from "@/lib/api-client";
import toast from "react-hot-toast";

/**
 * Hook for live customer & partner tracking on a specific booking.
 */
export function useBookingWebSocket(
  bookingId: string | null | undefined,
  callbacks?: {
    onUpdate?: (data: any) => void;
    onLocation?: (data: any) => void;
  }
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastBookingUpdate, setLastBookingUpdate] = useState<any>(null);
  const [lastLocation, setLastLocation] = useState<any>(null);
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    const client = new WebSocketClient(`/ws/bookings/${bookingId}/`);
    clientRef.current = client;

    client.on("open", () => setIsConnected(true));
    client.on("close", () => setIsConnected(false));

    client.on("booking_update", (data) => {
      setLastBookingUpdate(data);
      if (callbacks?.onUpdate) callbacks.onUpdate(data);
    });

    client.on("partner_location", (data) => {
      setLastLocation(data);
      if (callbacks?.onLocation) callbacks.onLocation(data);
    });

    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [bookingId]);

  const sendLocationUpdate = useCallback(
    (latitude: number, longitude: number, heading?: number, speed?: number) => {
      if (clientRef.current) {
        clientRef.current.send({
          type: "update_location",
          latitude,
          longitude,
          heading,
          speed,
        });
      }
    },
    []
  );

  return {
    isConnected,
    lastBookingUpdate,
    lastLocation,
    sendLocationUpdate,
  };
}

/**
 * Hook for real-time incoming offer radar & assignment stream for service partners.
 */
export function usePartnerStreamWebSocket(callbacks?: {
  onNewOffer?: (offer: any) => void;
  onOfferCancelled?: (data: any) => void;
  onBookingAssigned?: (data: any) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    const client = new WebSocketClient("/ws/partner/stream/");
    clientRef.current = client;

    client.on("open", () => setIsConnected(true));
    client.on("close", () => setIsConnected(false));

    client.on("new_offer", (offer) => {
      setOffers((prev) => {
        // Prevent duplicate offers in list
        const exists = prev.some((o) => o.id === offer.id || o.offer_id === offer.offer_id);
        if (exists) return prev;
        return [offer, ...prev];
      });

      if (callbacks?.onNewOffer) {
        callbacks.onNewOffer(offer);
      } else {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl pointer-events-auto flex p-4 text-white gap-3 items-start`}
            >
              <div className="w-3 h-3 mt-1.5 rounded-full bg-white animate-ping" />
              <div className="flex-1">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  New Instant Offer Dispatch!
                </p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {offer.category_name || "Service Request"} • ₹{offer.partner_payout || offer.quoted_price}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {offer.customer_address} ({offer.distance_km || "Nearby"} km)
                </p>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      }
    });

    client.on("offer_cancelled", (data) => {
      const cancelledId = data.offer_id;
      setOffers((prev) => prev.filter((o) => o.id !== cancelledId && o.offer_id !== cancelledId));
      if (callbacks?.onOfferCancelled) callbacks.onOfferCancelled(data);
    });

    client.on("booking_assigned", (data) => {
      if (callbacks?.onBookingAssigned) callbacks.onBookingAssigned(data);
    });

    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  return {
    isConnected,
    offers,
    setOffers,
  };
}

/**
 * Hook for global user notifications, sound alerts, and unread counter badge.
 */
export function useNotificationsWebSocket(callbacks?: {
  onNotification?: (notification: any) => void;
  onUnreadCount?: (count: number) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const clientRef = useRef<WebSocketClient | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/notifications/");
      if (Array.isArray(data)) {
        setNotifications(data);
      } else if (data?.results && Array.isArray(data.results)) {
        setNotifications(data.results);
      }
    } catch (e) {
      // Silently ignore if not logged in
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/notifications/unread-count/");
      if (typeof data.unread_count === "number") {
        setUnreadCount(data.unread_count);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    fetchNotifications();
    fetchUnreadCount();

    const client = new WebSocketClient("/ws/notifications/");
    clientRef.current = client;

    client.on("open", () => setIsConnected(true));
    client.on("close", () => setIsConnected(false));

    client.on("connection_established", (data) => {
      if (typeof data.unread_count === "number") {
        setUnreadCount(data.unread_count);
      }
    });

    client.on("unread_count", (count) => {
      setUnreadCount(count);
      if (callbacks?.onUnreadCount) callbacks.onUnreadCount(count);
    });

    client.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);

      toast(notif.title || "New Notification", {
        icon: "🔔",
        duration: 4000,
      });

      if (callbacks?.onNotification) callbacks.onNotification(notif);
    });

    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [fetchNotifications, fetchUnreadCount]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      // Ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post("/notifications/mark-all-read/");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark all as read");
    }
  };

  return {
    isConnected,
    unreadCount,
    setUnreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
