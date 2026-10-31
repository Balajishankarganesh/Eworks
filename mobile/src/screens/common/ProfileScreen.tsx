import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { useAuth } from "../../context/AuthContext";

export const ProfileScreen: React.FC = () => {
  const { user, role, switchRole, logout, apiUrl, setCustomApiUrl } = useAuth();
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(apiUrl);

  const handleSaveUrl = async () => {
    await setCustomApiUrl(urlInput.trim());
    setEditingUrl(false);
    Alert.alert("Target Saved", `API Base URL set to: ${urlInput.trim()}`);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Eworks?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="My Profile" subtitle="Account management & device settings" showLocation={false} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color="#ffffff" />
          </View>
          <Text style={styles.userName}>
            {user?.first_name || user?.full_name || "Eworks User"}
          </Text>
          <Text style={styles.userPhone}>{user?.phone || "+91 9876543210"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>Current View: {role}</Text>
          </View>
        </View>

        {/* 1-Click Role Switcher */}
        <View style={styles.actionCard}>
          <Text style={styles.cardSectionTitle}>Active Interface Mode</Text>
          <TouchableOpacity
            style={styles.switchRoleBtn}
            onPress={() => switchRole(role === "CUSTOMER" ? "PARTNER" : "CUSTOMER")}
          >
            <View style={styles.switchRoleLeft}>
              <Ionicons
                name={role === "CUSTOMER" ? "briefcase" : "person"}
                size={22}
                color="#ea580c"
              />
              <View>
                <Text style={styles.switchRoleTitle}>
                  Switch to {role === "CUSTOMER" ? "Partner (Technician)" : "Customer"} Mode
                </Text>
                <Text style={styles.switchRoleSub}>
                  {role === "CUSTOMER"
                    ? "View radar offers, turn-by-turn directions & OTP start"
                    : "Browse service categories and book technicians"}
                </Text>
              </View>
            </View>
            <Ionicons name="swap-horizontal" size={20} color="#ea580c" />
          </TouchableOpacity>
        </View>

        {/* Backend Server Connection Settings */}
        <View style={styles.actionCard}>
          <Text style={styles.cardSectionTitle}>Backend API Target</Text>
          <Text style={styles.cardSectionSub}>
            Configure your development machine host IP for network requests.
          </Text>

          {editingUrl ? (
            <View style={styles.editUrlBox}>
              <TextInput
                style={styles.urlInput}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
              />
              <View style={styles.urlPresetsRow}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setUrlInput("http://10.0.2.2:8000/api/v1")}
                >
                  <Text style={styles.presetText}>10.0.2.2 (Android)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setUrlInput("http://localhost:8000/api/v1")}
                >
                  <Text style={styles.presetText}>localhost (iOS)</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.urlBtnRow}>
                <TouchableOpacity
                  style={styles.cancelUrlBtn}
                  onPress={() => {
                    setUrlInput(apiUrl);
                    setEditingUrl(false);
                  }}
                >
                  <Text style={styles.cancelUrlText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveUrl}>
                  <Text style={styles.saveUrlText}>Save URL</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.urlDisplayRow}>
              <Text style={styles.urlDisplayText} numberOfLines={1}>
                {apiUrl}
              </Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditingUrl(true)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Platform Trust & Policy */}
        <View style={styles.actionCard}>
          <View style={styles.policyRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#16a34a" />
            <Text style={styles.policyRowText}>100% Free Platform: Zero Convenience Fees</Text>
          </View>
          <View style={styles.policyRow}>
            <Ionicons name="card-outline" size={20} color="#ea580c" />
            <Text style={styles.policyRowText}>Direct Settlement via Cash / Personal UPI QR</Text>
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  userPhone: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#c2410c",
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardSectionSub: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 16,
  },
  switchRoleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
  },
  switchRoleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  switchRoleTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  switchRoleSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  urlDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  urlDisplayText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  editBtn: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  editUrlBox: {
    marginTop: 4,
  },
  urlInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
  },
  urlPresetsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  urlBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  cancelUrlBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelUrlText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  saveUrlBtn: {
    flex: 2,
    backgroundColor: "#ea580c",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  saveUrlText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  policyRowText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  logoutBtnText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "800",
  },
});

