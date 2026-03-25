export const FINISHING_STATUS_OPTIONS = [
  "سوبر لوكس",
  "نصف تشطيب",
  "طوب احمر",
] as const;

export type FinishingStatus = (typeof FINISHING_STATUS_OPTIONS)[number];

export const HANDOVER_STATUS_OPTIONS = [
  "استلام فوري",
  "تحت الانشاء",
] as const;

export type HandoverStatus = (typeof HANDOVER_STATUS_OPTIONS)[number];
