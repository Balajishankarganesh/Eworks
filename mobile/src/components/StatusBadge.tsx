import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BookingStatus } from "../types";

interface StatusBadgeProps {
  status: BookingStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case "PENDING_MATCH":
      case "MATCHING":
        return {
          bg: "#eff6ff",
          text: "#1d4ed8",
          label: "Finding Partner...",
        };
      case "MATCHED":
      case "CONFIRMED":
        return {
          bg: "#f0fdf4",
          text: "#15803d",
          label: "Partner Assigned",
        };
      case "PARTNER_EN_ROUTE":
        return {
          bg: "#fff7ed",
          text: "#c2410c",
          label: "En Route to You",
        };
      case "IN_PROGRESS":
        return {
          bg: "#fef3c7",
          text: "#b45309",
          label: "Job In Progress",
        };
      case "COMPLETED":
        return {
          bg: "#f0fdf4",
          text: "#166534",
          label: "Completed",
        };
      case "CANCELLED_CUSTOMER":
      case "CANCELLED_PARTNER":
      case "CANCELLED_ADMIN":
        return {
          bg: "#fef2f2",
          text: "#b91c1c",
          label: "Cancelled",
        };
      default:
        return {
          bg: "#f1f5f9",
          text: "#475569",
          label: String(status).replace(/_/g, " "),
        };
    }
  };

  const { bg, text, label } = getStyle();

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
