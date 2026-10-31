import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLocation?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showLocation = true,
}) => {
  const { user, role, switchRole } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="build" size={16} color="#0f172a" />
          </View>
          <Text style={styles.brandText}>Eworks</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.roleBadge,
            role === "PARTNER" ? styles.partnerBadge : styles.customerBadge,
          ]}
          onPress={() => switchRole(role === "CUSTOMER" ? "PARTNER" : "CUSTOMER")}
        >
          <Ionicons
            name={role === "PARTNER" ? "briefcase" : "person"}
            size={12}
            color={role === "PARTNER" ? "#ea580c" : "#2563eb"}
          />
          <Text
            style={[
              styles.roleText,
              role === "PARTNER" ? styles.partnerRoleText : styles.customerRoleText,
            ]}
          >
            {role === "PARTNER" ? "Partner Mode" : "Customer"}
          </Text>
        </TouchableOpacity>
      </View>

      {showLocation && (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color="#f97316" />
          <Text style={styles.locationText} numberOfLines={1}>
            Anna Nagar, Chennai • Tamil Nadu
          </Text>
        </View>
      )}

      {title && <Text style={styles.titleText}>{title}</Text>}
      {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  customerBadge: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  partnerBadge: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  customerRoleText: {
    color: "#1d4ed8",
  },
  partnerRoleText: {
    color: "#c2410c",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 10,
  },
  subtitleText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
});

