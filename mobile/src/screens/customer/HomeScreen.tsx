import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { servicesApi } from "../../api/services";
import { ServiceCategory } from "../../types";

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await servicesApi.getCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case "electrician":
        return "flash";
      case "plumber":
        return "water";
      case "ac-repair":
        return "snow";
      case "appliance-repair":
        return "tv";
      case "cleaning":
        return "sparkles";
      case "painting":
        return "color-palette";
      default:
        return "construct";
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {/* Hero Value Proposition Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>⚡ 100% FREE PLATFORM</Text>
          </View>
          <Text style={styles.heroTitle}>Book Verified Home Technicians at ₹0 Commission</Text>
          <Text style={styles.heroSub}>
            Pay exact technician quotes directly via Cash or UPI QR. No middlemen fees.
          </Text>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Select a Service</Text>
          <Text style={styles.sectionSubtitle}>Verified local professionals near you</Text>
        </View>

        {/* Service Categories Grid */}
        {loading ? (
          <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id || cat.slug}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("BookingFlow", { category: cat })}
              >
                <View style={styles.cardIconBox}>
                  <Ionicons
                    name={getCategoryIcon(cat.slug) as any}
                    size={28}
                    color="#ea580c"
                  />
                </View>
                <Text style={styles.cardTitle}>{cat.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {cat.description}
                </Text>
                <View style={styles.cardPriceRow}>
                  <Text style={styles.cardPrice}>Starting ₹{cat.base_price}</Text>
                  <View style={styles.bookSmallBtn}>
                    <Text style={styles.bookSmallBtnText}>Book</Text>
                    <Ionicons name="arrow-forward" size={12} color="#ffffff" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Safety & Trust Badges */}
        <View style={styles.trustBox}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
            <Text style={styles.trustText}>ID & Police Verified</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="key" size={20} color="#ea580c" />
            <Text style={styles.trustText}>4-Digit Job Start OTP</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="wallet" size={20} color="#2563eb" />
            <Text style={styles.trustText}>Direct Settlement</Text>
          </View>
        </View>
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
  heroBanner: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  heroBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  heroBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  heroSub: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 15,
    minHeight: 30,
    marginBottom: 12,
  },
  cardPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  bookSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ea580c",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  bookSmallBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  trustBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  trustItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  trustText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
});
