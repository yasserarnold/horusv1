import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Property {
  id: string;
  property_code: string;
  name: string;
  description: string;
  property_type: string;
  listing_type: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floor: number | null;
  city: string;
  area_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  featured: boolean;
  owner_name?: string;
  owner_phone?: string;
  original_price?: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export const getPublicPropertyUrl = (propertyId: string): string => {
  return `${window.location.origin}?property=${propertyId}`;
};
