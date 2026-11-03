import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RapidoMap } from "../../components/RapidoMap";
import { partnerApi } from "../../api/partner";
import { PartnerOffer, Booking } from "../../types";
import { formatApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  getCurrentUserLocation,
  UserLocation,
  DEFAULT_COORDINATES,
} from "../../services/location";

const { width } = Dimensions.get("window");

export const PartnerRadarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, switchRole } = useAuth();

  const [partnerLocation, setPartnerLocation] = useState<UserLocation>(DEFAULT_COORDINATES);
  const [isOnline, setIsOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Spot partner location
  const locatePartner = useCallback(async () => {
    try {
      const loc = await getCurrentUserLocation();
      setPartnerLocation(loc);
    } catch (e) {
      console.warn("Partner location error:", e);
    }
  }, []);

  const loadPartnerData = async () => {
    try {
      const [profileData, offersData, jobsData] = await Promise.all([
        partnerApi.getProfile(),
        partnerApi.getOffers(),
        partnerApi.getAssignedJobs(),
      ]);
      setIsOnline(profileData.is_online ?? true);
      setOffers(offersData);
      setActiveJobs(
        jobsData.filter((j) =>
          ["MATCHED", "CONFIRMED", "PARTNER_EN_ROUTE", "IN_PROGRESS"].includes(j.status)
        )
      );
    } catch (e) {
      console.error("Partner data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    locatePartner();
    loadPartnerData();
    const interval = setInterval(loadPartnerData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleOnline = async (val: boolean) => {
    try {
      setTogglingOnline(true);
      const res = await partnerApi.toggleOnline(val);
      setIsOnline(res.is_online);
      Alert.alert(
        res.is_online ? "Radar Live! 🟢" : "Radar Offline ⚪",
        res.is_online
          ? "You are now online and ready to receive customer booking requests."
          : "You are offline. Toggle back on when you are ready to work."
      );
    } catch (err: any) {
      Alert.alert("Status Error", formatApiError(err));
      setIsOnline(!val);
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleRespondOffer = async (offerId: string, action: "ACCEPT" | "REJECT") => {
    try {
      setRespondingId(offerId);
      await partnerApi.respondToOffer(offerId, action);
      if (action === "ACCEPT") {
        Alert.alert(
          "Job Accepted! 🎉",
          "Head to the customer location. Collect the 4-digit Job Start OTP upon arrival."
        );
      }
      loadPartnerData();
    } catch (err: any) {
      Alert.alert("Offer Response", formatApiError(err));
    } finally {
      setRespondingId(null);
    }
  };

  const currentOffer = offers.length > 0 ? offers[0] : null;
  const currentActiveJob = activeJobs.length > 0 ? activeJobs[0] : null;

  return (
    <View style={styles.container}>
      {/* ── 1. Rapido Captain Full-Screen Map ────────────────────────── */}
      <RapidoMap
        latitude={partnerLocation.latitude}
        longitude={partnerLocation.longitude}
        showRadar={isOnline}
        radarRadiusMeters={3000}
        interactive={false}
      />

      {/* ── 2. Top Floating Online/Offline Switcher (Rapido Captain Style) */}
      <View style={[styles.topFloatingCard, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.topRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="radio" size={16} color="#0f172a" />
            <Text style={styles.brandTitle}>Captain Radar</Text>
          </View>

          {/* Quick role switcher */}
          <TouchableOpacity
            style={styles.roleSwitchBtn}
            activeOpacity={0.8}
            onPress={() => switchRole("CUSTOMER")}
          >
            <Ionicons name="swap-horizontal" size={16} color="#ffffff" />
            <Text style={styles.roleSwitchText}>Switch</Text>
          </TouchableOpacity>
        </View>

        {/* Online / Offline Toggle Card */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View style={styles.statusInfo}>
            <View style={[styles.pulseDot, isOnline ? styles.dotGreen : styles.dotGray]} />
            <View>
              <Text style={styles.statusStateText}>
                {isOnline ? "YOU ARE ONLINE" : "YOU ARE OFFLINE"}
              </Text>
              <Text style={styles.statusSubText}>
                {isOnline
                  ? "Broadcasting to customers within 5 km"
                  : "Turn on to receive instant job alerts"}
              </Text>
            </View>
          </View>

          {togglingOnline ? (
            <ActivityIndicator size="small" color="#ea580c" />
          ) : (
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: "#334155", true: "#22c55e" }}
              thumbColor={isOnline ? "#ffffff" : "#94a3b8"}
            />
          )}
        </View>
      </View>

      {/* ── 3. Quick Metrics Floating Strip ───────────────────────────── */}
      <View style={[styles.metricsStrip, { top: Math.max(insets.top, 12) + 125 }]}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>TODAY</Text>
          <Text style={styles.metricValue}>₹1,450</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>JOBS</Text>
          <Text style={styles.metricValue}>4 Done</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>COMMISSION</Text>
          <Text style={[styles.metricValue, { color: "#22c55e" }]}>₹0 (0%)</Text>
        </View>
      </View>

      {/* ── 4. Bottom Incoming Job Card / Active Job Card (Rapido Style) ─ */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Active Job Floating Alert */}
        {currentActiveJob && (
          <TouchableOpacity
            style={styles.activeJobBanner}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("ActiveJob", { booking: currentActiveJob })}
          >
            <View style={styles.activeJobIconWrap}>
              <Ionicons name="navigate" size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeJobTitle}>
                Active Job: {currentActiveJob.category?.name || "Service In Progress"}
              </Text>
              <Text style={styles.activeJobAddress} numberOfLines={1}>
                {currentActiveJob.address_text || "Customer Address"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#f97316" />
          </TouchableOpacity>
        )}

        {/* Incoming Offer Card (Rapido Captain Style) */}
        {currentOffer ? (
          <View style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <View style={styles.offerBadge}>
                <Ionicons name="notifications" size={14} color="#ea580c" />
                <Text style={styles.offerBadgeText}>NEW JOB REQUEST</Text>
              </View>
              <Text style={styles.offerExpiresText}>Expiring soon</Text>
            </View>

            <View style={styles.offerBody}>
              <View>
                <Text style={styles.offerCategory}>
                  {currentOffer.category_name || "Home Service"}
                </Text>
                <Text style={styles.offerProblem} numberOfLines={2}>
                  {currentOffer.problem_description || "General maintenance"}
                </Text>
                <Text style={styles.offerAddress} numberOfLines={1}>
                  📍 {currentOffer.customer_address || "Near your location"}
                </Text>
              </View>

              <View style={styles.offerPayoutBox}>
                <Text style={styles.offerPayoutLabel}>YOU EARN</Text>
                <Text style={styles.offerPayoutAmount}>
                  ₹{currentOffer.partner_payout || currentOffer.quoted_price || 299}
                </Text>
                <Text style={styles.offerPayoutSub}>100% Direct Cash/UPI</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.offerActionRow}>
              <TouchableOpacity
                style={styles.rejectButton}
                activeOpacity={0.8}
                onPress={() => handleRespondOffer(currentOffer.id, "REJECT")}
                disabled={respondingId !== null}
              >
                <Text style={styles.rejectButtonText}>Pass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                activeOpacity={0.8}
                onPress={() => handleRespondOffer(currentOffer.id, "ACCEPT")}
                disabled={respondingId !== null}
              >
                {respondingId === currentOffer.id ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#0f172a" />
                    <Text style={styles.acceptButtonText}>ACCEPT JOB</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Idle scanning card when no pending offers */
          <View style={styles.idleCard}>
            <View style={styles.idleIconBox}>
              <Ionicons
                name={isOnline ? "radio" : "cloud-offline"}
                size={22}
                color={isOnline ? "#22c55e" : "#94a3b8"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.idleTitle}>
                {isOnline ? "Scanning for nearby customers..." : "Radar is offline"}
              </Text>
              <Text style={styles.idleSubtitle}>
                {isOnline
                  ? "Incoming jobs will pop up with sound and 30s timer"
                  : "Turn switch above to start receiving jobs"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  // ── Top Floating Card ───────────────────────────────────────────────────
  topFloatingCard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f97316",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  brandTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  roleSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 6,
  },
  roleSwitchText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusCardOnline: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  statusCardOffline: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: {
    backgroundColor: "#22c55e",
  },
  dotGray: {
    backgroundColor: "#64748b",
  },
  statusStateText: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
  },
  statusSubText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
  },

  // ── Metrics Strip ───────────────────────────────────────────────────────
  metricsStrip: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    zIndex: 15,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  // ── Bottom Sheet / Cards ────────────────────────────────────────────────
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 20,
  },
  activeJobBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ea580c",
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeJobIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  activeJobTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  activeJobAddress: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "700",
  },

  offerCard: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#ea580c",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  offerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  offerBadgeText: {
    color: "#ea580c",
    fontSize: 10,
    fontWeight: "800",
  },
  offerExpiresText: {
    color: "#eab308",
    fontSize: 11,
    fontWeight: "700",
  },
  offerBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  offerCategory: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  offerProblem: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    maxWidth: width * 0.52,
    marginBottom: 4,
  },
  offerAddress: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
    maxWidth: width * 0.52,
  },
  offerPayoutBox: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    alignItems: "center",
  },
  offerPayoutLabel: {
    color: "#22c55e",
    fontSize: 9,
    fontWeight: "800",
  },
  offerPayoutAmount: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "900",
  },
  offerPayoutSub: {
    color: "#94a3b8",
    fontSize: 8,
    fontWeight: "600",
  },
  offerActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButtonText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
  },
  acceptButton: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  acceptButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },

  idleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  idleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  idleTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  idleSubtitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
  },
});
