import { NearbyPartner } from "../components/RapidoMap";

/**
 * Generate dynamic nearby verified technicians situated on streets around the user's GPS spot.
 */
export function getNearbyPartners(userLat: number, userLng: number): NearbyPartner[] {
  return [
    {
      id: "p-1",
      name: "Ramesh Kumar",
      categorySlug: "electrician",
      categoryIcon: "⚡",
      latitude: userLat + 0.0032,
      longitude: userLng + 0.0028,
      rating: 4.9,
      etaMinutes: 4,
    },
    {
      id: "p-2",
      name: "Suresh Vignesh",
      categorySlug: "plumber",
      categoryIcon: "🔧",
      latitude: userLat - 0.0025,
      longitude: userLng + 0.0041,
      rating: 4.8,
      etaMinutes: 6,
    },
    {
      id: "p-3",
      name: "Balaji Shankar",
      categorySlug: "ac-repair",
      categoryIcon: "❄️",
      latitude: userLat + 0.0048,
      longitude: userLng - 0.0035,
      rating: 5.0,
      etaMinutes: 7,
    },
    {
      id: "p-4",
      name: "Arumugam K",
      categorySlug: "carpenter",
      categoryIcon: "🔨",
      latitude: userLat - 0.0038,
      longitude: userLng - 0.0022,
      rating: 4.7,
      etaMinutes: 8,
    },
    {
      id: "p-5",
      name: "Lakshmi Narayanan",
      categorySlug: "cleaning",
      categoryIcon: "✨",
      latitude: userLat + 0.0019,
      longitude: userLng - 0.0051,
      rating: 4.9,
      etaMinutes: 11,
    },
    {
      id: "p-6",
      name: "Mohan Raj",
      categorySlug: "appliance-repair",
      categoryIcon: "📺",
      latitude: userLat - 0.0052,
      longitude: userLng + 0.0018,
      rating: 4.8,
      etaMinutes: 9,
    },
  ];
}
