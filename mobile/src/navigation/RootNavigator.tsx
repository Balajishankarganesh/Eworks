import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

// Auth
import { LoginScreen } from "../screens/auth/LoginScreen";

// Customer
import { CustomerTabs } from "./CustomerTabs";
import { BookingFlowScreen } from "../screens/customer/BookingFlowScreen";
import { BookingDetailScreen } from "../screens/customer/BookingDetailScreen";

// Partner
import { PartnerTabs } from "./PartnerTabs";

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : role === "PARTNER" ? (
          <Stack.Screen name="PartnerMain" component={PartnerTabs} />
        ) : (
          <>
            <Stack.Screen name="CustomerMain" component={CustomerTabs} />
            <Stack.Screen name="BookingFlow" component={BookingFlowScreen} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
});
