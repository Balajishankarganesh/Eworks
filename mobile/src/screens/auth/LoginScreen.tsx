import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/auth";
import { DEMO_USERS } from "../../config/env";
import { formatApiError } from "../../api/client";

export const LoginScreen: React.FC = () => {
  const { login, apiUrl, setCustomApiUrl } = useAuth();
  const [authMethod, setAuthMethod] = useState<"PHONE_OTP" | "PASSWORD">("PHONE_OTP");

  // Phone OTP State
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Email State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Server Settings
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(apiUrl);

  // Handle Send OTP
  const handleSendOtp = async (overridePhone?: string) => {
    const targetPhone = overridePhone || phone;
    if (!targetPhone.trim() || targetPhone.trim().length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    try {
      setSendingOtp(true);
      const res = await authApi.sendPhoneOtp(targetPhone.trim());
      setOtpSent(true);
      if (res.otp) {
        setDevOtp(res.otp);
      }
      Alert.alert("Code Sent", res.message || "OTP code sent via SMS & WhatsApp.");
    } catch (err: any) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert("Missing OTP", "Please enter the 6-digit verification code.");
      return;
    }

    try {
      setVerifyingOtp(true);
      const res = await authApi.verifyPhoneOtp(phone.trim(), otp.trim(), "CUSTOMER");
      await login(res.user, res.tokens);
    } catch (err: any) {
      Alert.alert("Verification Failed", formatApiError(err));
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Handle Email Password Login
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }

    try {
      setLoadingEmail(true);
      const res = await authApi.loginWithPassword(email.trim(), password.trim());
      await login(res.user, res.tokens);
    } catch (err: any) {
      Alert.alert("Login Failed", formatApiError(err));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleQuickFillPhone = (p: string) => {
    setPhone(p);
    setOtp(DEMO_USERS.masterOtp);
    handleSendOtp(p);
  };

  const handleQuickFillEmail = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.headerBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="build" size={32} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>Eworks</Text>
          <Text style={styles.brandSubtitle}>
            100% Free Hyperlocal Services Platform
          </Text>
          <Text style={styles.brandTag}>0% Commission • Direct Cash & UPI</Text>
        </View>

        {/* Auth Method Switcher Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, authMethod === "PHONE_OTP" && styles.tabButtonActive]}
            onPress={() => setAuthMethod("PHONE_OTP")}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={16}
              color={authMethod === "PHONE_OTP" ? "#ea580c" : "#64748b"}
            />
            <Text
              style={[
                styles.tabText,
                authMethod === "PHONE_OTP" && styles.tabTextActive,
              ]}
            >
              Phone OTP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, authMethod === "PASSWORD" && styles.tabButtonActive]}
            onPress={() => setAuthMethod("PASSWORD")}
          >
            <Ionicons
              name="mail-outline"
              size={16}
              color={authMethod === "PASSWORD" ? "#ea580c" : "#64748b"}
            />
            <Text
              style={[
                styles.tabText,
                authMethod === "PASSWORD" && styles.tabTextActive,
              ]}
            >
              Email & Password
            </Text>
          </TouchableOpacity>
        </View>

        {/* PHONE OTP TAB */}
        {authMethod === "PHONE_OTP" ? (
          <View style={styles.formCard}>
            {!otpSent ? (
              <View>
                <Text style={styles.inputLabel}>10-Digit Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="9876543210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
                <Text style={styles.helpText}>
                  We will send a 6-digit OTP verification code via SMS & WhatsApp.
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => handleSendOtp()}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Get Verification Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.sentInfoBox}>
                  <Text style={styles.sentInfoLabel}>OTP sent to: +91 {phone}</Text>
                  <TouchableOpacity onPress={() => setOtpSent(false)}>
                    <Text style={styles.changePhoneText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Dev Mode Code Auto-fill Banner */}
                <View style={styles.devBanner}>
                  <View style={styles.devBannerRow}>
                    <Text style={styles.devBannerTitle}>⚡ Dev Mock Active</Text>
                    <TouchableOpacity
                      style={styles.autoFillButton}
                      onPress={() => setOtp(devOtp || DEMO_USERS.masterOtp)}
                    >
                      <Text style={styles.autoFillButtonText}>
                        Auto-fill: {devOtp || DEMO_USERS.masterOtp}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.devBannerSub}>
                    Use master code {DEMO_USERS.masterOtp} or code above.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Enter 6-Digit OTP Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="123456"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleVerifyOtp}
                  disabled={verifyingOtp}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => handleSendOtp()}
                  disabled={sendingOtp}
                >
                  <Text style={styles.resendText}>Resend OTP Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* EMAIL & PASSWORD TAB */
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.standardInput}
              placeholder="you@eworks.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Password</Text>
            <TextInput
              style={styles.standardInput}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 20 }]}
              onPress={handleEmailLogin}
              disabled={loadingEmail}
            >
              {loadingEmail ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In with Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 1-CLICK QUICK FILL DEMO CHIPS */}
        <View style={styles.demoSection}>
          <Text style={styles.demoSectionTitle}>⚡ 1-Click Quick Fill Logins</Text>
          <View style={styles.demoChipRow}>
            {authMethod === "PHONE_OTP" ? (
              <>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleQuickFillPhone(DEMO_USERS.customer.phone)}
                >
                  <Text style={styles.demoChipTitle}>Customer (Priya)</Text>
                  <Text style={styles.demoChipSub}>+91 {DEMO_USERS.customer.phone}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoChip, styles.partnerDemoChip]}
                  onPress={() => handleQuickFillPhone(DEMO_USERS.partner.phone)}
                >
                  <Text style={[styles.demoChipTitle, styles.partnerChipText]}>
                    Partner (Balaji)
                  </Text>
                  <Text style={styles.demoChipSub}>+91 {DEMO_USERS.partner.phone}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() =>
                    handleQuickFillEmail(DEMO_USERS.customer.email, DEMO_USERS.customer.password)
                  }
                >
                  <Text style={styles.demoChipTitle}>Customer (Priya)</Text>
                  <Text style={styles.demoChipSub}>{DEMO_USERS.customer.email}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoChip, styles.partnerDemoChip]}
                  onPress={() =>
                    handleQuickFillEmail(DEMO_USERS.partner.email, DEMO_USERS.partner.password)
                  }
                >
                  <Text style={[styles.demoChipTitle, styles.partnerChipText]}>
                    Partner (Balaji)
                  </Text>
                  <Text style={styles.demoChipSub}>{DEMO_USERS.partner.email}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Server Base URL Setting */}
        <View style={styles.serverSettingsCard}>
          <TouchableOpacity
            style={styles.serverSettingsRow}
            onPress={() => setShowServerModal(!showServerModal)}
          >
            <Ionicons name="server-outline" size={16} color="#64748b" />
            <Text style={styles.serverSettingsText} numberOfLines={1}>
              API: {apiUrl}
            </Text>
            <Ionicons
              name={showServerModal ? "chevron-up" : "chevron-down"}
              size={16}
              color="#64748b"
            />
          </TouchableOpacity>

          {showServerModal && (
            <View style={styles.serverInputBox}>
              <Text style={styles.serverInputHint}>
                Change backend host (10.0.2.2 for Android emulator, LAN IP for phone):
              </Text>
              <TextInput
                style={styles.serverInput}
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.saveServerButton}
                onPress={() => {
                  setCustomApiUrl(serverUrlInput);
                  setShowServerModal(false);
                  Alert.alert("Saved", `API target updated to: ${serverUrlInput}`);
                }}
              >
                <Text style={styles.saveServerButtonText}>Update API Base URL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginTop: 4,
    fontWeight: "600",
  },
  brandTag: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "700",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#0f172a",
    fontWeight: "800",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
    fontWeight: "600",
    letterSpacing: 1,
  },
  helpText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 16,
  },
  standardInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  otpInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 22,
    color: "#0f172a",
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
  },
  sentInfoBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  sentInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9a3412",
  },
  changePhoneText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ea580c",
  },
  devBanner: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  devBannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  devBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400e",
  },
  autoFillButton: {
    backgroundColor: "#fde68a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoFillButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#78350f",
  },
  devBannerSub: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#ea580c",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  resendButton: {
    marginTop: 12,
    alignItems: "center",
  },
  resendText: {
    color: "#ea580c",
    fontSize: 13,
    fontWeight: "700",
  },
  demoSection: {
    marginTop: 24,
  },
  demoSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  demoChipRow: {
    flexDirection: "row",
    gap: 10,
  },
  demoChip: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  partnerDemoChip: {
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
  },
  demoChipTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
  },
  partnerChipText: {
    color: "#c2410c",
  },
  demoChipSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  serverSettingsCard: {
    marginTop: 24,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 12,
  },
  serverSettingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serverSettingsText: {
    flex: 1,
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  serverInputBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  serverInputHint: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 6,
  },
  serverInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
  },
  saveServerButton: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  saveServerButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
