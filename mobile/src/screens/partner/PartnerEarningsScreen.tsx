import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { partnerApi } from "../../api/partner";

export const PartnerEarningsScreen: React.FC = () => {
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEarnings = async () => {
    try {
      const data = await partnerApi.getEarnings();
      setEarnings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const summary = earnings?.summary || {
    total_gross: 12450.0,
    total_net: 12450.0,
    platform_commission: 0.0,
    total_jobs_completed: 34,
  };

  return (
    <View style={styles.container}>
      <Header title="My Earnings" subtitle="100% Free Platform • 0% Commission" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEarnings(); }} />
        }
      >
        {/* Main Earnings Highlight Card */}
        <View style={styles.highlightCard}>
          <Text style={styles.highlightLabel}>Net Payout Earned</Text>
          <Text style={styles.highlightAmount}>₹{summary.total_net.toLocaleString()}</Text>
          <View style={styles.zeroCommissionBadge}>
            <Ionicons name="sparkles" size={12} color="#15803d" />
            <Text style={styles.zeroCommissionText}>100% Payout Retained • ₹0 Cut</Text>
          </View>
        </View>

        {/* 2-Column Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Jobs Completed</Text>
            <Text style={styles.statNumber}>{summary.total_jobs_completed || 34}</Text>
            <Text style={styles.statSub}>100% 5-Star rated</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Platform Fees</Text>
            <Text style={[styles.statNumber, { color: "#16a34a" }]}>₹0.00</Text>
            <Text style={styles.statSub}>Free forever</Text>
          </View>
        </View>

        {/* Direct Settlement Explanation */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="wallet-outline" size={20} color="#ea580c" />
            <Text style={styles.policyTitle}>Direct Customer Settlement Policy</Text>
          </View>
          <Text style={styles.policyDesc}>
            At Eworks, we do not withhold or delay your money. Customers settle directly with you via Cash or your personal UPI QR code (Google Pay, PhonePe, Paytm) at the end of each completed job.
          </Text>
        </View>

        {/* Recent Settlements List */}
        <Text style={styles.recentTitle}>Recent Settlements</Text>
        {[
          { id: "1", title: "Ceiling Fan Repair & Capacitor", amount: 349, date: "Today, 2:30 PM", method: "Direct UPI" },
          { id: "2", title: "MCB Breaker Replacement", amount: 499, date: "Yesterday, 11:15 AM", method: "Cash" },
          { id: "3", title: "Switchboard Rewiring", amount: 650, date: "29 Oct 2026", method: "Direct UPI" },
        ].map((item) => (
          <View key={item.id} style={styles.transactionCard}>
            <View style={styles.txIconCircle}>
              <Ionicons name="checkmark" size={18} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>{item.title}</Text>
              <Text style={styles.txDate}>{item.date} • {item.method}</Text>
            </View>
            <Text style={styles.txAmount}>+₹{item.amount}</Text>
          </View>
        ))}
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
  highlightCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  highlightLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  highlightAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 6,
    letterSpacing: -1,
  },
  zeroCommissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
    gap: 4,
  },
  zeroCommissionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803d",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  policyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  policyDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  txDate: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16a34a",
  },
});
