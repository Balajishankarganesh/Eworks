import React, { useRef, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

export interface NearbyPartner {
  id: string;
  name: string;
  categorySlug: string;
  categoryIcon: string;
  latitude: number;
  longitude: number;
  rating: number;
  etaMinutes: number;
}

interface RapidoMapProps {
  latitude: number;
  longitude: number;
  selectedCategory?: string;
  nearbyPartners?: NearbyPartner[];
  onLocationSelect?: (coords: { lat: number; lng: number }) => void;
  showRadar?: boolean;
  radarRadiusMeters?: number;
  interactive?: boolean;
}

export const RapidoMap: React.FC<RapidoMapProps> = ({
  latitude,
  longitude,
  selectedCategory,
  nearbyPartners = [],
  onLocationSelect,
  showRadar = true,
  radarRadiusMeters = 2000,
  interactive = true,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Send updates to WebView whenever coordinates or selected category change
  useEffect(() => {
    if (webViewRef.current) {
      const payload = JSON.stringify({
        type: "UPDATE_VIEW",
        latitude,
        longitude,
        selectedCategory: selectedCategory || "",
        showRadar,
        radarRadiusMeters,
      });
      webViewRef.current.postMessage(payload);
    }
  }, [latitude, longitude, selectedCategory, showRadar, radarRadiusMeters]);

  // Construct Leaflet HTML template
  const generateMapHtml = () => {
    const partnersJson = JSON.stringify(nearbyPartners);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; background: #0f172a; overflow: hidden; }
    
    /* Rapido pulsing user location pin */
    .user-pulse-container {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-pulse-ring {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(234, 88, 12, 0.25);
      border: 1.5px solid rgba(234, 88, 12, 0.6);
      animation: ripple 2s infinite ease-out;
    }
    .user-pulse-core {
      width: 18px;
      height: 18px;
      background: #ea580c;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
      z-index: 2;
    }
    @keyframes ripple {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Rapido Captain / Technician Marker */
    .partner-pin {
      position: relative;
      width: 38px;
      height: 38px;
      background: #0f172a;
      border: 2px solid #ea580c;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      font-size: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .partner-pin.active {
      transform: scale(1.25);
      border-color: #f97316;
      background: #ea580c;
      box-shadow: 0 0 18px rgba(249, 115, 22, 0.8);
    }
    .partner-eta {
      position: absolute;
      bottom: -18px;
      background: #0f172a;
      color: #f8fafc;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 8px;
      border: 1px solid #334155;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }

    /* Clean attribution hiding for minimalist mobile UI */
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var currentLat = ${latitude};
    var currentLng = ${longitude};
    var selectedCat = "${selectedCategory || ""}";
    var partners = ${partnersJson};

    // Initialize Map with CartoDB Positron / Voyager high-performance tiles
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      tap: true,
      zoomSnap: 0.5,
    }).setView([currentLat, currentLng], 15.5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // User Location Marker
    var userIcon = L.divIcon({
      className: '',
      html: '<div class="user-pulse-container"><div class="user-pulse-ring"></div><div class="user-pulse-core"></div></div>',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
    var userMarker = L.marker([currentLat, currentLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

    // Radar scan circle
    var radarCircle = null;
    ${showRadar ? `
      radarCircle = L.circle([currentLat, currentLng], {
        radius: ${radarRadiusMeters},
        color: '#ea580c',
        weight: 1.5,
        fillColor: '#ea580c',
        fillOpacity: 0.08,
        dashArray: '4, 8'
      }).addTo(map);
    ` : ''}

    // Partner Markers
    var partnerMarkers = [];
    function renderPartners() {
      partnerMarkers.forEach(function(m) { map.removeLayer(m); });
      partnerMarkers = [];

      partners.forEach(function(p) {
        var isMatch = !selectedCat || p.categorySlug === selectedCat;
        var iconHtml = '<div class="partner-pin ' + (isMatch ? 'active' : '') + '">' +
          p.categoryIcon +
          '<div class="partner-eta">' + p.etaMinutes + 'm</div>' +
          '</div>';

        var pIcon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        var m = L.marker([p.latitude, p.longitude], { icon: pIcon }).addTo(map);
        partnerMarkers.push(m);
      });
    }
    renderPartners();

    // Map Tap Listener for selecting new locations
    ${interactive ? `
      map.on('click', function(e) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;
        userMarker.setLatLng([lat, lng]);
        if (radarCircle) radarCircle.setLatLng([lat, lng]);
        
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOCATION_CLICKED',
            lat: lat,
            lng: lng
          }));
        }
      });
    ` : ''}

    // Handle updates from React Native
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'UPDATE_VIEW') {
          currentLat = data.latitude;
          currentLng = data.longitude;
          selectedCat = data.selectedCategory;
          
          userMarker.setLatLng([currentLat, currentLng]);
          if (radarCircle) {
            radarCircle.setLatLng([currentLat, currentLng]);
            if (data.radarRadiusMeters) radarCircle.setRadius(data.radarRadiusMeters);
          }
          
          map.flyTo([currentLat, currentLng], 15.5, {
            animate: true,
            duration: 0.8
          });

          renderPartners();
        }
      } catch (err) {}
    });
  </script>
</body>
</html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "LOCATION_CLICKED" && onLocationSelect) {
        onLocationSelect({ lat: data.lat, lng: data.lng });
      }
    } catch (e) {
      console.warn("WebView message parse error:", e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: generateMapHtml() }}
        style={styles.webview}
        onMessage={handleMessage}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#ea580c" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  webview: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
});

