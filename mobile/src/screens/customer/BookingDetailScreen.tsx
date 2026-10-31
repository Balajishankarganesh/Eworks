import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBadge } from "../../components/StatusBadge";
import { bookingsApi } from "../../api/bookings";
import { Booking } from "../../types";
import { formatApiError } from "../../api/client";

export const BookingDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { bookingId, booking: initialBooking } = route.params || {};
  const [booking, setBooking] = useState<Booking | null>(initialBooking || null);
  const [loading, setLoading] = useState(!initialBooking);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const fetchDetail = async () => {
    try {
      const data = await bookingsApi.getBookingDetail(bookingId);
      setBooking(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // 10s polling heartbeat for status updates
    const interval = setInterval(fetchDetail, 10000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleResendOtp = async () => {
    try {
      setSendingOtp(true);
      const res = await bookingsApi.resendStartOtp(bookingId);
      Alert.alert("OTP Resent", res.message || "Job Start OTP dispatched to your registered phone.");
    } catch (err: any) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Service Request?",
      "Are you sure you want to cancel this booking? There is ₹0 cancellation fee.",
      [
        { text: "No, Keep Booking", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await bookingsApi.cancelBooking(bookingId, "Customer requested cancellation");
              Alert.alert("Booking Cancelled", "Your booking has been cancelled.");
              fetchDetail();
            } catch (err: any) {
              Alert.alert("Cancellation Failed", formatApiError(err));
            }
          },
        },
      ]
    );
  };

  if (loading && !booking) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Fetching live booking telemetry...</Text>
      </View>
    );
  }

  const status = booking?.status || "PENDING_MATCH";
  const showOtp =
    ["MATCHED", "CONFIRMED", "PARTNER_EN_ROUTE"].includes(status) && booking?.job_start_otp;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Booking Telemetry</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDetail}>
          <Ionicons name="refresh" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} />
        }
      >
        {/* Main Status Header Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.categoryName}>
              {booking?.category_name || booking?.category?.name || "Home Service"}
            </Text>
            <StatusBadge status={status} />
          </View>
          <Text style={styles.problemText}>{booking?.problem_description}</Text>
          <Text style={styles.bookingIdText}>ID: #{booking?.id?.slice(0, 8)}</Text>
        </View>

        {/* CRITICAL 4-DIGIT JOB START OTP CARD */}
        {showOtp && (
          <View style={styles.otpCard}>
            <View style={styles.otpHeaderRow}>
              <View style={styles.keyIconCircle}>
                <Ionicons name="key" size={20} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.otpCardTitle}>Job Start Security Code</Text>
                <Text style={styles.otpCardSub}>
                  Give this 4-digit OTP to your technician ONLY after they arrive at your door.
                </Text>
              </View>
            </View>

            <View style={styles.otpCodeBox}>
              <Text style={styles.otpCodeText}>{booking?.job_start_otp}</Text>
            </View>

            <TouchableOpacity
              style={styles.resendOtpBtn}
              onPress={handleResendOtp}
              disabled={sendingOtp}
            >
              {sendingOtp ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#ea580c" />
                  <Text style={styles.resendOtpBtnText}>Resend OTP via SMS & WhatsApp</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Assigned Partner Profile Card */}
        {booking?.partner ? (
          <View style={styles.partnerCard}>
            <View style={styles.partnerAvatarCircle}>
              <Ionicons name="person" size={24} color="#ea580c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerName}>{booking.partner.name || "Assigned Partner"}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.ratingText}>4.9 (Verified Professional)</Text>
              </View>
            </View>

            {/* Quick Call Button */}
            {booking.partner.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${booking.partner?.phone}`)}
              >
                <Ionicons name="call" size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.findingCard}>
            <ActivityIndicator color="#ea580c" />
            <View style={{ flex: 1 }}>
              <Text style={styles.findingTitle}>Broadcasting to Nearby Partners</Text>
              <Text style={styles.findingSub}>
                Pinging qualified technicians within 5km radius...
              </Text>
            </View>
          </View>
        )}

        {/* Location & Address Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>Service Address</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#64748b" />
            <Text style={styles.infoValue}>{booking?.address_text}</Text>
          </View>
        </View>

        {/* 100% Free Settlement Notice */}
        <View style={styles.freeSettlementCard}>
          <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
          <View style={{ flex: 1 }}>
            <Text style={styles.freeSettlementTitle}>₹0 Middleman Commission</Text>
            <Text style={styles.freeSettlementSub}>
              Pay direct Cash or UPI directly to technician upon completion. Total estimated: ₹{booking?.estimated_price || 299}.
            </Text>
          </View>
        </View>

        {/* Cancel Action */}
        {!["COMPLETED", "CANCELLED_CUSTOMER", "CANCELLED_PARTNER"].includes(status) && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
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
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  problemText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 8,
  },
  bookingIdText: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  otpCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#fed7aa",
  },
  otpHeaderRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  keyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  otpCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9a3412",
  },
  otpCardSub: {
    fontSize: 11,
    color: "#c2410c",
    marginTop: 2,
    lineHeight: 16,
  },
  otpCodeBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fdba74",
    paddingVertical: 14,
    marginVertical: 14,
    alignItems: "center",
  },
  otpCodeText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ea580c",
    letterSpacing: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  resendOtpBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  resendOtpBtnText: {
    color: "#ea580c",
    fontSize: 12,
    fontWeight: "700",
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  partnerAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  findingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  findingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  findingSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  freeSettlementCard: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 10,
    alignItems: "center",
  },
  freeSettlementTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  freeSettlementSub: {
    fontSize: 11,
    color: "#15803d",
    marginTop: 2,
    lineHeight: 16,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#dc2626",
  },
});
