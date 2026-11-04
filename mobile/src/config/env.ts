import { Platform } from "react-native";

/**
 * Environment configuration for Eworks Mobile App.
 *
 * Network host targeting:
 * - Android Emulator: 10.0.2.2 maps to host machine's localhost
 * - iOS Simulator: localhost maps to host machine
 * - Physical Phone: Use host machine's Wi-Fi LAN IP (e.g. 192.168.1.X) or ngrok/cloud URL
 */
// Detected local Wi-Fi IP and active Cloudflare tunnel for rock-solid global reachability:
const LAN_IP = "192.168.1.42";
const TUNNEL_URL = "https://teaching-drums-precision-banana.trycloudflare.com/api/v1";

export const ENV = {
  // Defaults to Cloudflare tunnel so physical devices connect instantly without LAN/Firewall limits:
  DEFAULT_API_BASE_URL: TUNNEL_URL,
  DEFAULT_WS_BASE_URL: "wss://teaching-drums-precision-banana.trycloudflare.com/ws",
  LAN_API_BASE_URL: `http://${LAN_IP}:8000/api/v1`,
  APP_NAME: "Eworks",
  TAGLINE: "Hyperlocal Home Services",
  CURRENCY_SYMBOL: "₹",
  COMMISSION_RATE: 0.0, // 100% Free platform
};

export const DEMO_USERS = {
  customer: {
    email: "customer@eworks.com",
    password: "Customer@123",
    phone: "9876543210",
    name: "Priya Sharma (Customer)",
  },
  partner: {
    email: "balajishankarganesh01@gmail.com",
    password: "Balaji@123",
    phone: "9300541897",
    name: "Balaji (Partner)",
  },
  partnerRamesh: {
    email: "partner@eworks.com",
    password: "Partner@123",
    phone: "9876543211",
    name: "Ramesh Kumar (Partner)",
  },
  masterOtp: "123456",
  masterJobOtp: "1234",
};

