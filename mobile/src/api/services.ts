import { apiClient, unwrapResults } from "./client";
import { ServiceCategory } from "../types";

export const servicesApi = {
  getCategories: async (): Promise<ServiceCategory[]> => {
    try {
      const { data } = await apiClient.get("/services/categories/");
      const items = unwrapResults<ServiceCategory>(data);
      if (items.length > 0) return items;
    } catch (e) {
      // Fallback fallback static catalog if backend offline
    }

    return [
      {
        id: "cat-1",
        name: "Electrician",
        slug: "electrician",
        description: "Fan installation, wiring, MCB tripping, switch repairs & lighting",
        base_price: 299,
        icon: "flash",
      },
      {
        id: "cat-2",
        name: "Plumber",
        slug: "plumber",
        description: "Tap leakage, pipe fittings, drain blocks, water heater install",
        base_price: 349,
        icon: "water",
      },
      {
        id: "cat-3",
        name: "AC Repair & Service",
        slug: "ac-repair",
        description: "Deep jet cleaning, gas charging, cooling issue, PCB repair",
        base_price: 499,
        icon: "snow",
      },
      {
        id: "cat-4",
        name: "Appliance Repair",
        slug: "appliance-repair",
        description: "Washing machine, refrigerator, microwave & TV technician",
        base_price: 399,
        icon: "tv",
      },
      {
        id: "cat-5",
        name: "Home Deep Cleaning",
        slug: "cleaning",
        description: "Kitchen, bathroom, sofa shampooing & full home sanitization",
        base_price: 699,
        icon: "sparkles",
      },
      {
        id: "cat-6",
        name: "Painting & Waterproofing",
        slug: "painting",
        description: "Interior/exterior wall painting, seepage repair & touchups",
        base_price: 899,
        icon: "color-palette",
      },
    ];
  },
};
