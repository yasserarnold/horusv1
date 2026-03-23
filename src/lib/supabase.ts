import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PUBLIC_PROPERTY_COLUMNS = [
  "id",
  "property_code",
  "name",
  "description",
  "property_type",
  "listing_type",
  "price",
  "area",
  "bedrooms",
  "bathrooms",
  "floor",
  "city",
  "area_name",
  "address",
  "latitude",
  "longitude",
  "images",
  "featured",
  "created_at",
  "updated_at",
].join(", ");

const configuredAdminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const configuredPublicSiteUrl = String(
  import.meta.env.VITE_PUBLIC_SITE_URL || "",
).trim();

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

const unwrapRpcRow = <T>(data: T[] | T | null): T | null => {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data ?? null;
};

const isMissingRpcError = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;

  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message?.includes("get_public_properties") ||
    error.message?.includes("get_public_property") ||
    error.message?.includes("Could not find the function") ||
    false
  );
};

const isMissingAdminInfraError = (error: {
  code?: string;
  message?: string;
} | null) => {
  if (!error) return false;

  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.code === "42P01" ||
    error.message?.includes("is_admin") ||
    error.message?.includes("admin_users") ||
    error.message?.includes("Could not find the function") ||
    error.message?.includes('relation "public.admin_users" does not exist') ||
    false
  );
};

const normalizePublicBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
};

const isPrivateIpv4Hostname = (hostname: string): boolean => {
  return (
    /^10\./.test(hostname) ||
    /^127\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

const isLocalHostname = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;

  return (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    isPrivateIpv4Hostname(normalized)
  );
};

const getPublicSiteBaseUrl = (): string => {
  if (configuredPublicSiteUrl) {
    return normalizePublicBaseUrl(configuredPublicSiteUrl);
  }

  if (typeof window === "undefined") {
    return "";
  }

  if (isLocalHostname(window.location.hostname)) {
    return "";
  }

  return normalizePublicBaseUrl(window.location.origin);
};

export const fetchPublicProperties = async (): Promise<Property[]> => {
  const { data, error } = await supabase.rpc("get_public_properties");

  if (!error) {
    return (data ?? []) as unknown as Property[];
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("properties")
    .select(PUBLIC_PROPERTY_COLUMNS)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (fallbackError) {
    throw fallbackError;
  }

  return (fallbackData ?? []) as unknown as Property[];
};

export const fetchPublicPropertyById = async (
  propertyId: string,
): Promise<Property | null> => {
  const { data, error } = await supabase.rpc("get_public_property", {
    property_id: propertyId,
  });

  if (!error) {
    return unwrapRpcRow<Property>(
      data as unknown as Property[] | Property | null,
    );
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("properties")
    .select(PUBLIC_PROPERTY_COLUMNS)
    .eq("id", propertyId)
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return fallbackData as unknown as Property | null;
};

export const checkIsAdmin = async (userEmail?: string | null): Promise<boolean> => {
  const { data, error } = await supabase.rpc("is_admin");

  if (!error) {
    return Boolean(data);
  }

  if (!isMissingAdminInfraError(error)) {
    throw error;
  }

  const normalizedEmail = userEmail?.trim().toLowerCase() || "";
  if (configuredAdminEmails.length > 0) {
    return configuredAdminEmails.includes(normalizedEmail);
  }

  // Backward-compatible fallback for environments that have not applied
  // the admin SQL migration yet. In that case we keep legacy behavior.
  return true;
};

export const getPublicPropertyPath = (propertyId: string): string => {
  return `/property/${encodeURIComponent(propertyId)}`;
};

export const getPublicPropertyUrl = (propertyId: string): string => {
  const publicSiteBaseUrl = getPublicSiteBaseUrl();
  if (!publicSiteBaseUrl) {
    return "";
  }

  return `${publicSiteBaseUrl}${getPublicPropertyPath(propertyId)}`;
};
