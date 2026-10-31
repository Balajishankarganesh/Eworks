# Eworks Mobile App (React Native / Expo)

Cross-platform mobile application for the **Eworks Hyperlocal Home Services Marketplace**.
Built with **React Native (Expo SDK 51), TypeScript, React Navigation 6, and Axios**.

---

## 🌟 Key Features

### 👤 Customer Experience
- **Interactive Service Directory**: Browse verified electricians, plumbers, AC technicians, cleaning, and appliance repair.
- **Instant Booking Engine**: Choose service problem, input service location, and dispatch requests to nearby certified technicians.
- **Live Security OTP Verification**: Generates a **4-digit Job Start OTP** for the customer to share with the technician only upon arrival.
- **100% Free Platform & Direct Settlement**: Real-time breakdown showing **₹0 convenience fee** and **0% commission**. Customer pays technician directly via Cash or personal UPI QR.

### 🛠️ Partner (Technician) Experience
- **Live Radar Dispatch Stream**: Online/Offline toggle with real-time audio/visual alert for incoming bookings within 5km radius.
- **Turn-by-turn Navigation**: Full customer address and 1-click phone dialer.
- **Job Start OTP Verification Modal**: Partner inputs the customer's 4-digit code (with dev bypass code `1234`) to officially start work.
- **Direct Payout Tracker**: View completed jobs, 100% take-home earnings, and instant payment settlement logs.

---

## 🚀 Quick Start Guide

### 1. Start the Expo Development Server

```bash
cd mobile
npm start
```

This launches the Expo CLI interactive dev server and prints a Metro QR code.

### 2. Run on Your Device

#### A. Physical Android Phone or iPhone (Recommended)
1. Install **Expo Go** from Google Play Store or Apple App Store.
2. Open Expo Go and scan the QR code displayed in your terminal.
3. The app loads instantly on your physical phone!

#### B. Android Emulator
Press `a` in the terminal to launch the Android emulator.

#### C. Web Browser
Press `w` in the terminal to open the React Native Web preview.

---

## 🌐 Connecting to the Backend

The mobile app connects to the Django backend (`http://localhost:8000/api/v1/`).

- **Android Emulator**: Uses `http://10.0.2.2:8000/api/v1` (maps to your PC's localhost).
- **Physical Phone**: In the app's login or profile screen, tap **"Edit API Target"** and enter your computer's Wi-Fi IP (e.g. `http://192.168.1.5:8000/api/v1`).

---

## ⚡ 1-Click Demo Logins

The login screen includes pre-configured 1-click quick-fill buttons:

| Account | Role | Phone | Email / Password |
| :--- | :--- | :--- | :--- |
| **Priya Sharma** | Customer | `+91 9876543210` | `customer@eworks.com` / `Customer@123` |
| **Balaji S** | Partner | `+91 9300541897` | `balajishankarganesh01@gmail.com` / `Balaji@123` |
| **Ramesh Kumar**| Partner | `+91 9876543211` | `partner@eworks.com` / `Partner@123` |

> **Development OTP**: Master demo code **`123456`** always bypasses phone SMS verification in development.
> **Job Start OTP**: Master demo code **`1234`** bypasses technician job start verification.

---

## 📦 Building a Standalone Android APK

To generate an installable `.apk` file for Android distribution without needing Expo Go:

```bash
npx eas-cli build -p android --profile preview
```
