import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { partnerApi } from "../../api/partner";
import { PartnerOffer, Booking } from "../../types";
import { formatApiError } from "../../api/client";

export const PartnerRadarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

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
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
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
        res.is_online ? "You are Online! 🟢" : "You are Offline ⚪",
        res.is_online
          ? "You will now receive instant audio pings for nearby customer requests."
          : "You will not receive any new service requests until you go online."
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
        Alert.alert("Job Accepted! 🎉", "Navigate to customer address and ask for their 4-digit Job Start OTP.");
      }
      loadPartnerData();
    } catch (err: any) {
      Alert.alert("Offer Response", formatApiError(err));
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Partner Radar" subtitle="Live dispatch & job stream" />

      {/* Online / Offline Switch Bar */}
      <View style={[styles.statusBar, isOnline ? styles.statusOnline : styles.statusOffline]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, isOnline ? styles.dotGreen : styles.dotGray]} />
          <View>
            <Text style={styles.statusTitle}>
              {isOnline ? "RADAR BROADCAST ACTIVE" : "RADAR OFFLINE"}
            </Text>
            <Text style={styles.statusSub}>
              {isOnline
                ? "GPS active • 5km matching radius"
                : "Turn on to receive instant service offers"}
            </Text>
          </View>
        </View>

        {togglingOnline ? (
          <ActivityIndicator size="small" color="#ea580c" />
        ) : (
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: "#cbd5e1", true: "#fdba74" }}
            thumbColor={isOnline ? "#ea580c" : "#f1f5f9"}
          />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPartnerData(); }} />
        }
      >
        {/* Active Jobs Shortcut if any */}
        {activeJobs.length > 0 && (
          <TouchableOpacity
            style={styles.activeJobBanner}
            onPress={() => navigation.navigate("ActiveJobTab")}
          >
            <View style={styles.activeJobLeft}>
              <View style={styles.activeJobPulse} />
              <View>
                <Text style={styles.activeJobTitle}>
                  {activeJobs.length} Active Job in Progress
                </Text>
                <Text style={styles.activeJobSub}>
                  {activeJobs[0].category_name || "Service"} • Tap to view directions & start OTP
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#c2410c" />
          </TouchableOpacity>
        )}

        {/* Radar Offers Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Incoming Service Requests</Text>
          <Text style={styles.sectionSub}>Accept before the offer expires</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 30 }} />
        ) : !isOnline ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>You are currently Offline</Text>
            <Text style={styles.emptySub}>
              Switch the toggle above to Go Online and receive live job pings.
            </Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="radio-outline" size={48} color="#ea580c" />
            <Text style={styles.emptyTitle}>Scanning Anna Nagar Radar...</Text>
            <Text style={styles.emptySub}>
              New bookings will appear here instantly with sound alert.
            </Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{offer.category_name}</Text>
                </View>
                <View style={styles.payoutBadge}>
                  <Text style={styles.payoutText}>₹{offer.partner_payout}</Text>
                  <Text style={styles.payoutSub}>100% Net</Text>
                </View>
              </View>

              <Text style={styles.offerProblem}>{offer.problem_description}</Text>

              <View style={styles.offerAddressRow}>
                <Ionicons name="location" size={16} color="#ea580c" />
                <Text style={styles.offerAddress} numberOfLines={2}>
                  {offer.customer_address}
                </Text>
              </View>

              {offer.distance_km && (
                <Text style={styles.distanceText}>📍 Approx. {offer.distance_km} km away</Text>
              )}

              {/* Action Buttons */}
              <View style={styles.offerActionsRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleRespondOffer(offer.id, "REJECT")}
                  disabled={respondingId === offer.id}
                >
                  <Text style={styles.rejectBtnText}>Pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleRespondOffer(offer.id, "ACCEPT")}
                  disabled={respondingId === offer.id}
                >
                  {respondingId === offer.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.acceptBtnText}>Accept Job (₹{offer.partner_payout})</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusOnline: {
    backgroundColor: "#f0fdf4",
    borderBottomColor: "#bbf7d0",
  },
  statusOffline: {
    backgroundColor: "#f1f5f9",
    borderBottomColor: "#e2e8f0",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotGreen: {
    backgroundColor: "#16a34a",
  },
  dotGray: {
    backgroundColor: "#94a3b8",
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  statusSub: {
    fontSize: 11,
    color: "#64748b",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeJobBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  activeJobLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  activeJobPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ea580c",
  },
  activeJobTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9a3412",
  },
  activeJobSub: {
    fontSize: 11,
    color: "#c2410c",
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  offerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  payoutBadge: {
    alignItems: "flex-end",
  },
  payoutText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#16a34a",
  },
  payoutSub: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
  },
  offerProblem: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    lineHeight: 20,
    marginBottom: 10,
  },
  offerAddressRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    marginBottom: 6,
  },
  offerAddress: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
  distanceText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 14,
  },
  offerActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});
