import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RapidoMap } from "../../components/RapidoMap";
import { servicesApi } from "../../api/services";
import { ServiceCategory } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  getCurrentUserLocation,
  UserLocation,
  DEFAULT_COORDINATES,
} from "../../services/location";
import { getNearbyPartners } from "../../services/nearby";

const { width } = Dimensions.get("window");

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, switchRole } = useAuth();

  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation>(DEFAULT_COORDINATES);
  const [isLocating, setIsLocating] = useState(true);

  // Categories & Selection
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch spotted location on mount
  const locateUser = useCallback(async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      setUserLocation(loc);
    } catch (e) {
      console.warn("Location error:", e);
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Fetch categories
  const loadCategories = async () => {
    try {
      const data = await servicesApi.getCategories();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0]);
      }
    } catch (e) {
      console.error("Categories error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    locateUser();
    loadCategories();
  }, []);

  // Compute nearby technicians around spotted coordinates
  const nearbyPartners = getNearbyPartners(
    userLocation.latitude,
    userLocation.longitude
  );

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      case "carpenter":
        return "hammer";
      default:
        return "construct";
    }
  };

  const getEstimatedEta = (slug: string) => {
    switch (slug) {
      case "electrician":
        return "4 min away";
      case "plumber":
        return "6 min away";
      case "ac-repair":
        return "7 min away";
      case "carpenter":
        return "8 min away";
      case "cleaning":
        return "11 min away";
      default:
        return "9 min away";
    }
  };

  const handleBookSelected = () => {
    if (!selectedCategory) return;
    navigation.navigate("BookingFlow", {
      category: selectedCategory,
      address: userLocation.address,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    });
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Rapido Full-Screen Background Map ────────────────────────── */}
      <RapidoMap
        latitude={userLocation.latitude}
        longitude={userLocation.longitude}
        selectedCategory={selectedCategory?.slug}
        nearbyPartners={nearbyPartners}
        showRadar={true}
        radarRadiusMeters={1800}
        onLocationSelect={(coords) => {
          setUserLocation((prev) => ({
            ...prev,
            latitude: coords.lat,
            longitude: coords.lng,
            address: `Near ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
            area: "Selected Pin Location",
          }));
        }}
      />

      {/* ── 2. Top Floating Navigation & Search Bar (Rapido Style) ──────── */}
      <View style={[styles.topFloatingCard, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Row 1: Logo + Spotted Location Capsule + Role Switcher */}
        <View style={styles.topRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="flash" size={16} color="#0f172a" />
            <Text style={styles.logoText}>
              E<Text style={styles.logoTextHighlight}>works</Text>
            </Text>
          </View>

          {/* Spotted GPS Capsule */}
          <TouchableOpacity
            style={styles.locationCapsule}
            activeOpacity={0.8}
            onPress={locateUser}
          >
            <View style={styles.pulseDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationCapsuleLabel}>SPOTTED LOCATION</Text>
              <Text style={styles.locationCapsuleAddress} numberOfLines={1}>
                {isLocating ? "Locating device..." : userLocation.area || userLocation.city}
              </Text>
            </View>
            <Ionicons
              name={isLocating ? "sync" : "chevron-down"}
              size={14}
              color="#ea580c"
            />
          </TouchableOpacity>

          {/* Role switcher button */}
          <TouchableOpacity
            style={styles.roleSwitchBtn}
            activeOpacity={0.8}
            onPress={() => switchRole("PARTNER")}
          >
            <Ionicons name="swap-horizontal" size={16} color="#f8fafc" />
          </TouchableOpacity>
        </View>

        {/* Row 2: Search input */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Electrician, Plumber, AC Repair..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 3. Floating Re-Center GPS Button (Right Side) ──────────────── */}
      <View style={[styles.floatingControls, { bottom: 250 }]}>
        <TouchableOpacity
          style={styles.gpsButton}
          activeOpacity={0.8}
          onPress={locateUser}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#ea580c" />
          ) : (
            <Ionicons name="locate" size={24} color="#ea580c" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── 4. Rapido Bottom Sheet / Service Selector ─────────────────── */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Drag handle */}
        <View style={styles.sheetHandle} />

        {/* Header row */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Verified Nearby Pros</Text>
            <Text style={styles.sheetSubtitle}>
              {userLocation.address || "Hyperlocal Home Services"}
            </Text>
          </View>
          <View style={styles.freePlatformBadge}>
            <Text style={styles.freePlatformBadgeText}>₹0 FEE • 100% FREE</Text>
          </View>
        </View>

        {/* Horizontal Category Carousel */}
        {loading ? (
          <ActivityIndicator size="small" color="#ea580c" style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={filteredCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id || item.slug}
            contentContainerStyle={styles.categoryScroll}
            renderItem={({ item }) => {
              const isSelected = selectedCategory?.slug === item.slug;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedCategory(item)}
                >
                  <View
                    style={[
                      styles.categoryIconWrap,
                      isSelected && styles.categoryIconWrapSelected,
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(item.slug) as any}
                      size={24}
                      color={isSelected ? "#ffffff" : "#ea580c"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.categoryPrice}>
                    ₹{item.base_price || 199}
                  </Text>
                  <Text style={styles.categoryEta}>
                    {getEstimatedEta(item.slug)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Primary Action Button (Rapido Style) */}
        {selectedCategory && (
          <TouchableOpacity
            style={styles.bookNowButton}
            activeOpacity={0.9}
            onPress={handleBookSelected}
          >
            <View style={styles.bookNowContent}>
              <View>
                <Text style={styles.bookNowTitle}>
                  Book {selectedCategory.name}
                </Text>
                <Text style={styles.bookNowSub}>
                  Direct UPI / Cash to Pro • No Middlemen
                </Text>
              </View>
              <View style={styles.bookNowPriceBox}>
                <Text style={styles.bookNowPrice}>
                  ₹{selectedCategory.base_price || 199}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#0f172a" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  // ── Top Floating Card ───────────────────────────────────────────────────
  topFloatingCard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f97316",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  logoText: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 14,
  },
  logoTextHighlight: {
    color: "#ffffff",
  },
  locationCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  locationCapsuleLabel: {
    color: "#ea580c",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  locationCapsuleAddress: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
  roleSwitchBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 13,
  },

  // ── Floating GPS Button ─────────────────────────────────────────────────
  floatingControls: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  gpsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // ── Bottom Sheet (Rapido Style) ─────────────────────────────────────────
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },
  sheetSubtitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
    maxWidth: width * 0.55,
  },
  freePlatformBadge: {
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.4)",
  },
  freePlatformBadgeText: {
    color: "#ea580c",
    fontSize: 10,
    fontWeight: "800",
  },

  categoryScroll: {
    paddingVertical: 4,
    gap: 10,
    marginBottom: 12,
  },
  categoryCard: {
    width: 100,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  categoryCardSelected: {
    borderColor: "#ea580c",
    backgroundColor: "rgba(234, 88, 12, 0.12)",
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryIconWrapSelected: {
    backgroundColor: "#ea580c",
  },
  categoryName: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  categoryNameSelected: {
    color: "#f8fafc",
  },
  categoryPrice: {
    color: "#ea580c",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  categoryEta: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
  },

  // Primary Book Now Button
  bookNowButton: {
    backgroundColor: "#ea580c",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  bookNowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookNowTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  bookNowSub: {
    color: "rgba(15, 23, 42, 0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  bookNowPriceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  bookNowPrice: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
});
