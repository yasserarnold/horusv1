import { Property } from "./supabase";

const normalizeArabicText = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
};

export const getDisplayHandoverStatus = (
  property: Pick<Property, "handover_status" | "finishing_status" | "description">,
): string | null => {
  if (property.handover_status) {
    return property.handover_status;
  }

  if (
    property.finishing_status === "طوب احمر" ||
    property.finishing_status === ("تحت الإنشاء" as never)
  ) {
    return "تحت الانشاء";
  }

  if (
    property.finishing_status === "سوبر لوكس" ||
    property.finishing_status === "نصف تشطيب"
  ) {
    return "استلام فوري";
  }

  const description = normalizeArabicText(property.description || "");
  if (!description) {
    return null;
  }

  if (description.includes("استلام فوري")) {
    return "استلام فوري";
  }

  if (
    description.includes("تحت الانشاء") ||
    description.includes("استلام بعد") ||
    /استلام\s+\d+/.test(description) ||
    /استلام\s+[٠-٩]+/.test(description)
  ) {
    return "تحت الانشاء";
  }

  return null;
};
