import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { PartnerRadarScreen } from "../screens/partner/PartnerRadarScreen";
import { ActiveJobScreen } from "../screens/partner/ActiveJobScreen";
import { PartnerEarningsScreen } from "../screens/partner/PartnerEarningsScreen";
import { ProfileScreen } from "../screens/common/ProfileScreen";

const Tab = createBottomTabNavigator();

export const PartnerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ea580c",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="RadarTab"
        component={PartnerRadarScreen}
        options={{
          tabBarLabel: "Radar Stream",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ActiveJobTab"
        component={ActiveJobScreen}
        options={{
          tabBarLabel: "Active Job",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={PartnerEarningsScreen}
        options={{
          tabBarLabel: "Earnings (₹0 Cut)",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
