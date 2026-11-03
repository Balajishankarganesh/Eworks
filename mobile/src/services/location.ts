import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  area: string;
}

// Default fallback coordinates (Chennai, India — central hub)
export const DEFAULT_COORDINATES = {
  latitude: 13.0827,
  longitude: 80.2707,
  address: "Anna Nagar, Chennai, Tamil Nadu",
  city: "Chennai",
  area: "Anna Nagar",
};

/**
 * Request GPS permission and fetch current physical device location with reverse geocoding.
 * Safely falls back to default coordinates if permissions are denied or location is disabled.
 */
export async function getCurrentUserLocation(): Promise<UserLocation> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Location permission not granted, using fallback coordinates");
      return DEFAULT_COORDINATES;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = loc.coords;

    // Reverse geocode to get human-readable street/area address
    let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    let city = "Current Area";
    let area = "Nearby";

    try {
      const geocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocoded && geocoded.length > 0) {
        const place = geocoded[0];
        const parts = [
          place.name || place.street,
          place.district || place.subregion,
          place.city,
        ].filter(Boolean);

        if (parts.length > 0) {
          address = parts.join(", ");
        }
        city = place.city || place.region || "Current City";
        area = place.district || place.name || place.street || "Current Location";
      }
    } catch (geoError) {
      console.warn("Reverse geocode failed:", geoError);
    }

    return {
      latitude,
      longitude,
      address,
      city,
      area,
    };
  } catch (error) {
    console.warn("Failed to get device location:", error);
    return DEFAULT_COORDINATES;
  }
}
