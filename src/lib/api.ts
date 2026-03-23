import { fetchPublicProperties, Property } from "./supabase";

export async function fetchProperties(): Promise<Property[]> {
  try {
    return await fetchPublicProperties();
  } catch (error) {
    console.error("Unexpected error fetching properties:", error);
    return [];
  }
}
