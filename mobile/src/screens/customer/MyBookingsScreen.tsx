import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { StatusBadge } from "../../components/StatusBadge";
import { bookingsApi } from "../../api/bookings";
import { Booking } from "../../types";

export const MyBookingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  const loadBookings = async () => {
    try {
      const data = await bookingsApi.getMyBookings();
      setBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
    const unsubscribe = navigation.addListener("focus", loadBookings);
    return unsubscribe;
  }, [navigation]);

  const activeBookings = bookings.filter((b) =>
    ["PENDING_MATCH", "MATCHING", "MATCHED", "CONFIRMED", "PARTNER_EN_ROUTE", "IN_PROGRESS"].includes(
      b.status
    )
  );

  const historyBookings = bookings.filter((b) =>
    ["COMPLETED", "CANCELLED_CUSTOMER", "CANCELLED_PARTNER", "CANCELLED_ADMIN"].includes(b.status)
  );

  const displayedList = activeTab === "ACTIVE" ? activeBookings : historyBookings;

  return (
    <View style={styles.container}>
      <Header title="My Bookings" subtitle="Live tracking & service history" showLocation={false} />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "ACTIVE" && styles.tabItemActive]}
          onPress={() => setActiveTab("ACTIVE")}
        >
          <Text style={[styles.tabItemText, activeTab === "ACTIVE" && styles.tabItemTextActive]}>
            Active ({activeBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "HISTORY" && styles.tabItemActive]}
          onPress={() => setActiveTab("HISTORY")}
        >
          <Text style={[styles.tabItemText, activeTab === "HISTORY" && styles.tabItemTextActive]}>
            History ({historyBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      ) : displayedList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} bookings</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === "ACTIVE"
              ? "Need an electrician or plumber? Book a verified technician now."
              : "Completed services will appear here."}
          </Text>
          {activeTab === "ACTIVE" && (
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => navigation.navigate("HomeTab")}
            >
              <Text style={styles.bookNowBtnText}>Explore Services</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBookings(); }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookingCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id, booking: item })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardCategory}>
                  {item.category_name || item.category?.name || "Service"}
                </Text>
                <StatusBadge status={item.status} />
              </View>

              <Text style={styles.cardProblem} numberOfLines={2}>
                {item.problem_description}
              </Text>

              {item.job_start_otp && ["MATCHED", "CONFIRMED", "PARTNER_EN_ROUTE"].includes(item.status) && (
                <View style={styles.cardOtpBadge}>
                  <Ionicons name="key" size={14} color="#ea580c" />
                  <Text style={styles.cardOtpText}>Job Start OTP: {item.job_start_otp}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {item.address_text}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#ea580c",
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  tabItemTextActive: {
    color: "#ea580c",
    fontWeight: "800",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  bookNowBtn: {
    marginTop: 16,
    backgroundColor: "#ea580c",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookNowBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  bookingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardProblem: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  cardOtpBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 10,
  },
  cardOtpText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#c2410c",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  cardAddress: {
    fontSize: 12,
    color: "#64748b",
  },
});
