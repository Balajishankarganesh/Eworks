# Eworks Mobile App (React Native / Expo SDK 52)

Cross-platform mobile application for the **Eworks Hyperlocal Home Services Marketplace**.
Built with **React Native (Expo SDK 52), TypeScript, React Navigation 6, and Axios**.

---

## 🌟 Key Features

### 👤 Customer Experience (Rapido-Style Map UI)
- **Live Spotted Location Pin**: Pulsing radar wave with automatic GPS geolocation and reverse-geocoding.
- **Nearby Technician Floating Pins**: Real-time floating markers for certified Electricians (⚡), Plumbers (🔧), AC Specialists (❄️), Carpenters (🔨), and Cleaning Pros (✨) dotted around local streets.
- **Sliding Service Selector Drawer**: Fast horizontal cards with live arrival ETA, inspection base price, and 0% platform fee guarantee.
- **Instant Booking Engine**: Dispatches requests to nearby technicians with spotted GPS coordinates.
- **Live Security OTP Verification**: Generates a **4-digit Job Start OTP** for the customer to share with the technician only upon arrival.
- **100% Free Platform & Direct Settlement**: Real-time breakdown showing **₹0 convenience fee** and **0% commission**. Customer pays technician directly via Cash or personal UPI QR.

### 🛠️ Partner (Technician) Experience (Rapido Captain UI)
- **Live Radar Dispatch Map**: Full-screen map with active 5 km broadcast circle.
- **Online / Offline Toggle**: Instant availability switch.
- **Incoming Job Dispatch Cards**: Real-time customer pickup address, distance, 100% direct take-home earnings, and 30-second accept countdown.
- **Job Start OTP Verification Modal**: Partner inputs the customer's 4-digit code (with dev bypass code `1234`) to officially start work.
- **Direct Payout Tracker**: View completed jobs, 100% take-home earnings, and instant payment settlement logs.

---

## 🚀 Quick Start Guide

### 1. Start the Expo Development Server

```bash
cd mobile
npx expo start --tunnel
```

This launches the Metro bundler with an official cloud tunnel and outputs an `exp://...` URL.

### 2. Run on Your Device

#### Physical Android Phone or iPhone (Recommended)
1. Install **Expo Go** from Google Play Store or Apple App Store.
2. In Expo Go, tap **"Enter URL manually"** and paste the tunnel URL.
3. The app loads instantly on your physical phone!

---

## 📦 Building for Google Play Store & Android APK

### 1. Build Production Android App Bundle (`.aab` for Play Store)
Google Play Store mandates the `.aab` format for all new apps:

```bash
cd mobile
npx eas-cli build --platform android --profile production
```

### 2. Build Standalone Preview APK (`.apk` for Direct Testing)
To generate an installable `.apk` file for testing directly on any Android phone without Expo Go:

```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

---

## 🚀 Google Play Console Launch Checklist

1. **Google Play Developer Account**: Sign up at [play.google.com/console](https://play.google.com/console) ($25 one-time registration fee).
2. **Package Name**: Pre-configured as `com.eworks.app` in `app.json`.
3. **App Details**:
   - **App Name**: `Eworks - Hyperlocal Home Services`
   - **Short Description**: `Book electricians, plumbers, AC repair & home cleaning at 0% platform fee.`
   - **Full Description**: `Eworks is India's 100% free hyperlocal home services platform. Book verified technicians near you with live radar dispatch, ₹0 convenience fees, and direct settlement via Cash or personal UPI QR.`
4. **App Assets**:
   - App Icon: `1024x1024` (Auto-generated in `assets/icon.png`)
   - Adaptive Icon: `assets/adaptive-icon.png` (Foreground + Background `#0f172a`)
   - Splash Screen: `assets/splash.png`
   - Feature Graphic: `1024x500` banner
5. **Permissions & Privacy**:
   - Location: Required for spotting nearby service pros and customer address.
   - Privacy Policy URL: Mandated by Google (e.g. `https://eworks.app/privacy`).
6. **Upload & Release**:
   - Create a new release in **Production** track.
   - Upload the generated `.aab` bundle from EAS Build.
   - Review and submit for Google review (typically approved in 24–48 hours).

---

## ⚡ 1-Click Demo Logins

| Account | Role | Phone | Email / Password |
| :--- | :--- | :--- | :--- |
| **Priya Sharma** | Customer | `+91 9876543210` | `customer@eworks.com` / `Customer@123` |
| **Balaji S** | Partner | `+91 9300541897` | `balajishankarganesh01@gmail.com` / `Balaji@123` |
| **Ramesh Kumar**| Partner | `+91 9876543211` | `partner@eworks.com` / `Partner@123` |

> **Development OTP**: Master demo code **`123456`** always bypasses phone SMS verification in development.
> **Job Start OTP**: Master demo code **`1234`** bypasses technician job start verification.
