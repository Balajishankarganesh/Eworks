import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { StatusBadge } from "../../components/StatusBadge";
import { partnerApi } from "../../api/partner";
import { Booking } from "../../types";
import { formatApiError } from "../../api/client";
import { DEMO_USERS } from "../../config/env";

export const ActiveJobScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // OTP Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [completingJob, setCompletingJob] = useState(false);

  const loadActiveJobs = async () => {
    try {
      const data = await partnerApi.getAssignedJobs();
      setJobs(
        data.filter((j) =>
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
    loadActiveJobs();
    const unsubscribe = navigation.addListener("focus", loadActiveJobs);
    return unsubscribe;
  }, [navigation]);

  const handleOpenStartJob = (bookingId: string) => {
    setActiveJobId(bookingId);
    setEnteredOtp("");
    setOtpModalVisible(true);
  };

  const handleVerifyOtpAndStart = async () => {
    if (!enteredOtp.trim() || !activeJobId) {
      Alert.alert("Missing OTP", "Please enter the 4-digit code provided by the customer.");
      return;
    }

    try {
      setVerifyingOtp(true);
      await partnerApi.startJob(activeJobId, enteredOtp.trim());
      setOtpModalVisible(false);
      Alert.alert("Job Started! ⚡", "Security OTP verified. Job is now officially In Progress.");
      loadActiveJobs();
    } catch (err: any) {
      Alert.alert("Invalid OTP", formatApiError(err));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCompleteJob = (bookingId: string) => {
    Alert.alert(
      "Complete Service?",
      "Have you finished all repairs and collected payment directly from customer (Cash / UPI)?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Complete Job",
          onPress: async () => {
            try {
              setCompletingJob(true);
              await partnerApi.completeJob(bookingId);
              Alert.alert("Job Completed! 🏆", "Earnings added to your profile. ₹0 commission deducted!");
              loadActiveJobs();
            } catch (err: any) {
              Alert.alert("Completion Error", formatApiError(err));
            } finally {
              setCompletingJob(false);
            }
          },
        },
      ]
    );
  };

  const currentJob = jobs[0];

  return (
    <View style={styles.container}>
      <Header title="Current Job Dispatch" subtitle="Turn-by-turn customer service execution" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadActiveJobs(); }} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 40 }} />
        ) : !currentJob ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color="#16a34a" />
            <Text style={styles.emptyTitle}>No Active Jobs Assigned</Text>
            <Text style={styles.emptySub}>
              Accept new requests on the Radar tab to start your next service call.
            </Text>
            <TouchableOpacity
              style={styles.radarBtn}
              onPress={() => navigation.navigate("RadarTab")}
            >
              <Text style={styles.radarBtnText}>Go to Radar Stream</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Status Card */}
            <View style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobCategory}>
                  {currentJob.category_name || currentJob.category?.name || "Service Request"}
                </Text>
                <StatusBadge status={currentJob.status} />
              </View>

              <Text style={styles.problemText}>{currentJob.problem_description}</Text>

              {/* Customer Contact Box */}
              <View style={styles.customerBox}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={20} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>
                    {currentJob.customer?.first_name || "Customer"}
                  </Text>
                  <Text style={styles.customerPhone}>
                    {currentJob.customer?.phone || "+91 9876543210"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() =>
                    Linking.openURL(`tel:${currentJob.customer?.phone || "9876543210"}`)
                  }
                >
                  <Ionicons name="call" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Address & Navigation */}
              <View style={styles.addressSection}>
                <Ionicons name="location" size={18} color="#ea580c" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressHeading}>Destination Address</Text>
                  <Text style={styles.addressValue}>{currentJob.address_text}</Text>
                </View>
              </View>

              {/* 100% Free Settlement Box */}
              <View style={styles.settlementBox}>
                <Text style={styles.settlementTitle}>Direct Payment Due:</Text>
                <Text style={styles.settlementAmount}>
                  ₹{currentJob.final_price || currentJob.estimated_price || 299}
                </Text>
                <Text style={styles.settlementSub}>
                  Collect directly from customer via Cash or your UPI QR. 0% platform deduction.
                </Text>
              </View>

              {/* ACTION BUTTONS BASED ON STATUS */}
              {["MATCHED", "CONFIRMED", "PARTNER_EN_ROUTE"].includes(currentJob.status) ? (
                <TouchableOpacity
                  style={styles.startJobBtn}
                  onPress={() => handleOpenStartJob(currentJob.id)}
                >
                  <Ionicons name="key" size={18} color="#ffffff" />
                  <Text style={styles.startJobBtnText}>Enter Customer 4-Digit OTP to Start</Text>
                </TouchableOpacity>
              ) : currentJob.status === "IN_PROGRESS" ? (
                <TouchableOpacity
                  style={styles.completeJobBtn}
                  onPress={() => handleCompleteJob(currentJob.id)}
                  disabled={completingJob}
                >
                  {completingJob ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.completeJobBtnText}>Complete Job & Collect Payment</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 4-DIGIT JOB START OTP MODAL */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="shield-checkmark" size={32} color="#ea580c" />
            </View>
            <Text style={styles.modalTitle}>Enter Customer's 4-Digit OTP</Text>
            <Text style={styles.modalSub}>
              Ask the customer for the security verification code displayed on their screen.
            </Text>

            {/* Quick Master Code Fill */}
            <TouchableOpacity
              style={styles.masterDevBadge}
              onPress={() => setEnteredOtp(DEMO_USERS.masterJobOtp)}
            >
              <Text style={styles.masterDevText}>
                ⚡ Dev Bypass: Click to auto-fill code {DEMO_USERS.masterJobOtp}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.otpInputField}
              placeholder="••••"
              placeholderTextColor="#cbd5e1"
              keyboardType="number-pad"
              maxLength={4}
              value={enteredOtp}
              onChangeText={setEnteredOtp}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalVerifyBtn}
                onPress={handleVerifyOtpAndStart}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalVerifyText}>Verify & Start Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 30,
    marginTop: 30,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  radarBtn: {
    marginTop: 16,
    backgroundColor: "#ea580c",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  radarBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  jobCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  jobCategory: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  problemText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 16,
  },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
    gap: 10,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  customerPhone: {
    fontSize: 12,
    color: "#64748b",
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  addressSection: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  addressHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  addressValue: {
    fontSize: 13,
    color: "#1e293b",
    marginTop: 2,
    lineHeight: 18,
  },
  settlementBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 20,
  },
  settlementTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  settlementAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#15803d",
    marginTop: 2,
  },
  settlementSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 4,
    lineHeight: 16,
  },
  startJobBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ea580c",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  startJobBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  completeJobBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  completeJobBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 16,
  },
  masterDevBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  masterDevText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
  },
  otpInputField: {
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#ea580c",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 32,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 14,
    textAlign: "center",
    width: "70%",
    marginVertical: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  modalVerifyBtn: {
    flex: 2,
    backgroundColor: "#ea580c",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalVerifyText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});

