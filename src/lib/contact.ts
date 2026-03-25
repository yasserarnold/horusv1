export const SALES_PHONE_NUMBER = "00201002100785";
export const SALES_PHONE_DISPLAY = "+20 100 210 0785";
export const SALES_WHATSAPP_NUMBER = "201002100785";

export const buildWhatsAppUrl = (
  message: string,
  whatsappNumber = SALES_WHATSAPP_NUMBER,
): string => {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};
