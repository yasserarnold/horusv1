import { supabase } from "./supabase";

export interface City {
  id: string;
  name: string;
  name_en?: string;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  city_id: string;
  name: string;
  name_en?: string;
  created_at: string;
  updated_at: string;
}

export interface AreaWithCity extends Area {
  city_name: string;
}

// Cache للبيانات لتقليل الاستعلامات
let citiesCache: City[] | null = null;
const areasCache: Map<string, Area[]> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

/**
 * جلب جميع المدن من قاعدة البيانات
 */
export const getCities = async (): Promise<City[]> => {
  // التحقق من الكاش
  const now = Date.now();
  if (citiesCache && now - cacheTimestamp < CACHE_DURATION) {
    return citiesCache;
  }

  try {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    citiesCache = data || [];
    cacheTimestamp = now;
    return citiesCache;
  } catch (error) {
    console.error("Error fetching cities:", error);
    return [];
  }
};

/**
 * جلب جميع المناطق لمدينة معينة
 */
export const getAreasByCity = async (cityId: string): Promise<Area[]> => {
  // التحقق من الكاش
  const cached = areasCache.get(cityId);
  if (cached) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from("areas")
      .select("*")
      .eq("city_id", cityId)
      .order("name", { ascending: true });

    if (error) throw error;

    const areas = data || [];
    areasCache.set(cityId, areas);
    return areas;
  } catch (error) {
    console.error("Error fetching areas:", error);
    return [];
  }
};

/**
 * جلب المناطق حسب اسم المدينة
 */
export const getAreasByCityName = async (cityName: string): Promise<Area[]> => {
  try {
    // أولاً، جلب المدينة
    const { data: cityData, error: cityError } = await supabase
      .from("cities")
      .select("id")
      .eq("name", cityName)
      .single();

    if (cityError || !cityData) {
      return [];
    }

    return await getAreasByCity(cityData.id);
  } catch (error) {
    console.error("Error fetching areas by city name:", error);
    return [];
  }
};

/**
 * جلب مدينة حسب الاسم
 */
export const getCityByName = async (cityName: string): Promise<City | null> => {
  try {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("name", cityName)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching city:", error);
    return null;
  }
};

/**
 * جلب منطقة حسب الاسم واسم المدينة
 */
export const getAreaByName = async (
  areaName: string,
  cityName: string,
): Promise<Area | null> => {
  try {
    const city = await getCityByName(cityName);
    if (!city) return null;

    const { data, error } = await supabase
      .from("areas")
      .select("*")
      .eq("city_id", city.id)
      .eq("name", areaName)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching area:", error);
    return null;
  }
};

/**
 * إضافة مدينة جديدة
 */
export const addCity = async (name: string): Promise<City | null> => {
  try {
    const { data, error } = await supabase
      .from("cities")
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;

    // مسح الكاش
    citiesCache = null;
    return data;
  } catch (error) {
    console.error("Error adding city:", error);
    return null;
  }
};

/**
 * إضافة منطقة جديدة
 */
export const addArea = async (
  cityId: string,
  name: string,
): Promise<Area | null> => {
  try {
    const { data, error } = await supabase
      .from("areas")
      .insert([{ city_id: cityId, name }])
      .select()
      .single();

    if (error) throw error;

    // مسح الكاش
    areasCache.delete(cityId);
    return data;
  } catch (error) {
    console.error("Error adding area:", error);
    return null;
  }
};

/**
 * تحديث مدينة
 */
export const updateCity = async (
  id: string,
  name: string,
): Promise<City | null> => {
  try {
    const { data, error } = await supabase
      .from("cities")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // مسح الكاش
    citiesCache = null;
    return data;
  } catch (error) {
    console.error("Error updating city:", error);
    return null;
  }
};

/**
 * تحديث منطقة
 */
export const updateArea = async (
  id: string,
  name: string,
): Promise<Area | null> => {
  try {
    const { data, error } = await supabase
      .from("areas")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // مسح الكاش
    areasCache.clear();
    return data;
  } catch (error) {
    console.error("Error updating area:", error);
    return null;
  }
};

/**
 * حذف مدينة
 */
export const deleteCity = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("cities").delete().eq("id", id);

    if (error) throw error;

    // مسح الكاش
    citiesCache = null;
    areasCache.clear();
    return true;
  } catch (error) {
    console.error("Error deleting city:", error);
    return false;
  }
};

/**
 * حذف منطقة
 */
export const deleteArea = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("areas").delete().eq("id", id);

    if (error) throw error;

    // مسح الكاش
    areasCache.clear();
    return true;
  } catch (error) {
    console.error("Error deleting area:", error);
    return false;
  }
};

/**
 * مسح الكاش (للاستخدام عند الحاجة)
 */
export const clearCache = () => {
  citiesCache = null;
  areasCache.clear();
  cacheTimestamp = 0;
};
