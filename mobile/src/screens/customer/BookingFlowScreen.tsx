import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { bookingsApi } from "../../api/bookings";
import { formatApiError } from "../../api/client";

export const BookingFlowScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { category, address: initialAddress, latitude, longitude } = route.params || {};

  const [problem, setProblem] = useState("");
  const [address, setAddress] = useState(
    initialAddress || "Flat 4B, Emerald Heights, Anna Nagar, Chennai - 600040"
  );
  const [bookingType, setBookingType] = useState<"INSTANT" | "SCHEDULED">("INSTANT");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmBooking = async () => {
    if (!problem.trim()) {
      Alert.alert("Missing Details", "Please describe the problem you need solved.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Missing Address", "Please provide the service address.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await bookingsApi.createBooking({
        category_id: category?.id,
        category_name: category?.name,
        problem_description: problem.trim(),
        address_text: address.trim(),
        latitude,
        longitude,
        booking_type: bookingType,
      });

      Alert.alert(
        "Request Dispatched! 🚀",
        "Our hyperlocal matching engine is pinging nearby certified technicians in Anna Nagar.",
        [
          {
            text: "Track Booking",
            onPress: () => navigation.replace("BookingDetail", { bookingId: res.id, booking: res }),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Booking Failed", formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const basePrice = category?.base_price || 299;

  return (
    <View style={styles.container}>
      {/* Custom Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Book {category?.name || "Service"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Problem Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>1. What seems to be the issue?</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Ceiling fan making loud sparking noise, or switchboard MCB tripping..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={problem}
            onChangeText={setProblem}
          />
          <View style={styles.quickTagsRow}>
            {["General Inspection", "New Installation", "Urgent Repair"].map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.quickTag}
                onPress={() => setProblem((prev) => (prev ? `${prev}, ${tag}` : tag))}
              >
                <Text style={styles.quickTagText}>+ {tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Service Location */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>2. Service Address</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location" size={20} color="#ea580c" style={{ marginTop: 2 }} />
            <TextInput
              style={styles.addressInput}
              placeholder="Door / Flat No, Street, Area, City"
              placeholderTextColor="#94a3b8"
              multiline
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        {/* Step 3: Speed / Timing */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>3. When do you need this?</Text>
          <View style={styles.speedRow}>
            <TouchableOpacity
              style={[styles.speedOption, bookingType === "INSTANT" && styles.speedOptionActive]}
              onPress={() => setBookingType("INSTANT")}
            >
              <Ionicons
                name="flash"
                size={18}
                color={bookingType === "INSTANT" ? "#ea580c" : "#64748b"}
              />
              <Text
                style={[
                  styles.speedOptionTitle,
                  bookingType === "INSTANT" && styles.speedOptionTitleActive,
                ]}
              >
                Instant Match (15–30 Mins)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.speedOption, bookingType === "SCHEDULED" && styles.speedOptionActive]}
              onPress={() => setBookingType("SCHEDULED")}
            >
              <Ionicons
                name="calendar"
                size={18}
                color={bookingType === "SCHEDULED" ? "#ea580c" : "#64748b"}
              />
              <Text
                style={[
                  styles.speedOptionTitle,
                  bookingType === "SCHEDULED" && styles.speedOptionTitleActive,
                ]}
              >
                Schedule for Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Summary (100% Free Platform) */}
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>Settlement Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Base Service Inspection</Text>
            <Text style={styles.priceValue}>₹{basePrice}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform Convenience Fee</Text>
            <Text style={styles.freeValue}>₹0 (Free)</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform Commission</Text>
            <Text style={styles.freeValue}>0% (Free)</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>₹{basePrice}</Text>
          </View>
          <Text style={styles.directSettlementNotice}>
            🤝 100% Direct Settlement: Pay your technician directly via Cash or UPI QR once the job is completed to your satisfaction.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Submit Button */}
      <View style={styles.footerBar}>
        <View>
          <Text style={styles.footerTotalLabel}>Total Estimate</Text>
          <Text style={styles.footerTotalAmount}>₹{basePrice}</Text>
        </View>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmBooking}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.confirmButtonText}>Confirm & Find Partner</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    textAlignVertical: "top",
    minHeight: 80,
  },
  quickTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  quickTag: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#c2410c",
  },
  addressBox: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  addressInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    lineHeight: 18,
  },
  speedRow: {
    gap: 10,
  },
  speedOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  speedOptionActive: {
    borderColor: "#ea580c",
    backgroundColor: "#fff7ed",
  },
  speedOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  speedOptionTitleActive: {
    color: "#c2410c",
  },
  pricingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pricingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  freeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16a34a",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ea580c",
  },
  directSettlementNotice: {
    fontSize: 11,
    color: "#059669",
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 10,
    lineHeight: 16,
    fontWeight: "600",
  },
  footerBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerTotalLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  footerTotalAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },
  confirmButton: {
    backgroundColor: "#ea580c",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});

