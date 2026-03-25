import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bath,
  Bed,
  ChevronLeft,
  ChevronRight,
  Home,
  Layers,
  MapPin,
  Maximize,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { Property } from "../lib/supabase";
import {
  SALES_PHONE_DISPLAY,
  SALES_PHONE_NUMBER,
  SALES_WHATSAPP_NUMBER,
  buildWhatsAppUrl,
} from "../lib/contact";
import { getDisplayHandoverStatus } from "../lib/propertyStatus";
import { ImageLightbox } from "./ImageLightbox";

const priceFormatter = new Intl.NumberFormat("ar-EG");
const fallbackImage =
  "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200";

interface ApartmentPageProps {
  property: Property;
  phoneNumber?: string;
  phoneDisplay?: string;
  whatsappNumber?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

interface LeadButtonProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  className: string;
  target?: "_blank";
  rel?: string;
  style?: React.CSSProperties;
}

const formatPrice = (price: number) => `${priceFormatter.format(price)} جنيه`;

const addMonths = (date: Date, months: number) => {
  const nextDate = new Date(date);
  const originalDay = nextDate.getDate();

  nextDate.setMonth(nextDate.getMonth() + months);

  if (nextDate.getDate() < originalDay) {
    nextDate.setDate(0);
  }

  return nextDate;
};

const getConstructionCountdown = (createdAt: string, nowMs: number) => {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  const targetDate = addMonths(createdDate, 6);
  const targetTime = targetDate.getTime();

  if (targetTime <= nowMs) {
    return {
      expired: true,
      months: 0,
      days: 0,
      hours: 0,
      targetLabel: targetDate.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  }

  let cursor = new Date(nowMs);
  let months = 0;

  while (true) {
    const nextMonth = addMonths(cursor, 1);
    if (nextMonth.getTime() <= targetTime) {
      months += 1;
      cursor = nextMonth;
      continue;
    }
    break;
  }

  let remainingMs = targetTime - cursor.getTime();
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  remainingMs -= days * 1000 * 60 * 60 * 24;
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));

  return {
    expired: false,
    months,
    days,
    hours,
    targetLabel: targetDate.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
};

const buildPropertyMessage = (property: Property) => {
  const handoverStatus = getDisplayHandoverStatus(property);

  return [
    "مرحباً، أريد حجز معاينة لهذه الوحدة.",
    `العقار: ${property.name}`,
    `الكود: ${property.property_code || "---"}`,
    `المنطقة: ${property.area_name} - ${property.city}`,
    ...(property.finishing_status
      ? [`التشطيب: ${property.finishing_status}`]
      : []),
    ...(handoverStatus ? [`الاستلام: ${handoverStatus}`] : []),
    `السعر: ${formatPrice(property.price)}`,
  ].join("\n");
};

const buildQuickDescription = (property: Property) => {
  if (property.description?.trim()) {
    return property.description;
  }

  return `وحدة ${property.property_type} ${property.listing_type} في ${property.area_name} بمدينة ${property.city} بمساحة ${property.area} متر مربع وسعر ${formatPrice(property.price)}.`;
};

const StatCard = ({ icon, label, value, className = "", style }: StatCardProps) => (
  <div
    style={style}
    className={`rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/15 ${className}`}
  >
    <div className="mb-2 text-amber-300">{icon}</div>
    <p className="text-sm text-slate-300">{label}</p>
    <p className="mt-1 text-lg font-bold text-white">{value}</p>
  </div>
);

const LeadButton = ({
  href,
  label,
  icon,
  className,
  target,
  rel,
  style,
}: LeadButtonProps) => (
  <a
    href={href}
    target={target}
    rel={rel}
    style={style}
    className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${className}`}
  >
    <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.22),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
    <span className="relative z-10">{icon}</span>
    <span className="relative z-10">{label}</span>
  </a>
);

export const ApartmentPage = ({
  property,
  phoneNumber = SALES_PHONE_NUMBER,
  phoneDisplay = SALES_PHONE_DISPLAY,
  whatsappNumber = SALES_WHATSAPP_NUMBER,
}: ApartmentPageProps) => {
  const [activeImage, setActiveImage] = useState(0);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const handoverStatus = getDisplayHandoverStatus(property);

  const images =
    property.images && property.images.length > 0
      ? property.images
      : [fallbackImage];
  const videos = property.videos || [];

  const whatsappHref = buildWhatsAppUrl(
    buildPropertyMessage(property),
    whatsappNumber,
  );
  const callHref = `tel:${phoneNumber.replace(/[^\d+]/g, "")}`;
  const fullDescription = buildQuickDescription(property);
  const heroDescription =
    fullDescription.length > 180
      ? `${fullDescription.slice(0, 180).trim()}...`
      : fullDescription;
  const locationLabel = `${property.area_name} - ${property.city}`;
  const addressLabel = property.address?.trim() || locationLabel;
  const urgencyCopy = `الوحدات المماثلة في ${property.area_name} بهذا السعر تتحرك بسرعة. إذا كانت هذه المواصفات مناسبة لك، فالأفضل حجز المعاينة الآن قبل تغيّر السعر أو اختفاء الخيارات المتاحة.`;
  const isUnderConstruction = handoverStatus === "تحت الانشاء";
  const constructionCountdown = isUnderConstruction
    ? getConstructionCountdown(property.created_at, now)
    : null;

  useEffect(() => {
    setActiveImage(0);
  }, [property.id]);

  useEffect(() => {
    setNow(Date.now());

    if (!isUnderConstruction) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [isUnderConstruction, property.id]);

  return (
    <div className="pb-28 lg:pb-0">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.24),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.94),_rgba(2,6,23,1))]" />
        <div className="hero-grid-drift absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="hero-orb absolute -right-24 top-10 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="hero-orb absolute -left-20 bottom-12 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="hero-orb absolute left-1/3 top-1/4 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05),rgba(2,6,23,0.52))]" />
        <div className="container relative mx-auto px-4 py-6 sm:py-8 lg:py-12">
          <Link
            to="/"
            className="hero-reveal mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            style={{ animationDelay: "40ms" }}
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div
                className="hero-reveal flex flex-wrap items-center gap-3"
                style={{ animationDelay: "90ms" }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-100 backdrop-blur-sm">
                  <span className="hero-pulse-soft h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  وحدة تتحرك سريعاً في السوق
                </span>
                {property.property_code && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm">
                    كود العقار: {property.property_code}
                  </span>
                )}
              </div>

              <div
                className="hero-reveal mt-4 flex flex-wrap gap-2"
                style={{ animationDelay: "140ms" }}
              >
                <span className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">
                  {property.listing_type}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85">
                  {property.property_type}
                </span>
                {property.finishing_status && (
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100">
                    التشطيب: {property.finishing_status}
                  </span>
                )}
                {handoverStatus && (
                  <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-100">
                    الاستلام: {handoverStatus}
                  </span>
                )}
                {property.featured && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                    <Star className="h-4 w-4" />
                    <span>إعلان مميز</span>
                  </span>
                )}
              </div>

              <div className="mt-6">
                {constructionCountdown ? (
                  <div
                    className="hero-reveal rounded-[28px] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(15,23,42,0.2))] p-5 shadow-[0_24px_80px_-42px_rgba(245,158,11,0.7)] backdrop-blur-md"
                    style={{ animationDelay: "190ms" }}
                  >
                    <p className="text-sm font-bold text-amber-300">
                      {constructionCountdown.expired
                        ? "انتهت مدة أول 6 أشهر من الإعلان"
                        : "الاستلام بعد"}
                    </p>
                    {constructionCountdown.expired ? (
                      <p className="mt-2 text-sm text-slate-300">
                        تاريخ نهاية العد: {constructionCountdown.targetLabel}
                      </p>
                    ) : (
                      <>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <div className="min-w-[88px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center backdrop-blur-sm">
                            <p className="text-2xl font-black text-amber-300">
                              {constructionCountdown.months}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-200">
                              أشهر
                            </p>
                          </div>
                          <div className="min-w-[88px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center backdrop-blur-sm">
                            <p className="text-2xl font-black text-amber-300">
                              {constructionCountdown.days}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-200">
                              أيام
                            </p>
                          </div>
                          <div className="min-w-[88px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center backdrop-blur-sm">
                            <p className="text-2xl font-black text-amber-300">
                              {constructionCountdown.hours}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-200">
                              ساعات
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p
                    className="hero-reveal text-sm font-bold text-amber-300"
                    style={{ animationDelay: "190ms" }}
                  >
                    فرصة جاهزة للمعاينة والتفاوض
                  </p>
                )}
                <h1
                  className="hero-reveal mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl"
                  style={{ animationDelay: "240ms" }}
                >
                  {property.name}
                </h1>
                <div
                  className="hero-reveal mt-4 flex items-center gap-2 text-slate-200"
                  style={{ animationDelay: "280ms" }}
                >
                  <MapPin className="h-5 w-5 flex-shrink-0 text-amber-300" />
                  <span className="text-sm sm:text-base">{locationLabel}</span>
                </div>
              </div>

              <div
                className="hero-reveal mt-6 rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.07))] p-5 shadow-[0_24px_100px_-45px_rgba(15,23,42,0.85)] backdrop-blur-sm sm:p-6"
                style={{ animationDelay: "340ms" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-300">
                      السعر المطلوب
                    </p>
                    <p className="mt-2 text-4xl font-black text-amber-300 sm:text-5xl">
                      {formatPrice(property.price)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
                    <p className="font-bold text-white">{property.area} م²</p>
                    <p className="mt-1 text-xs text-slate-300">
                      مساحة عملية مناسبة للمعاينة
                    </p>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                  {heroDescription}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  icon={<Maximize className="h-5 w-5" />}
                  label="المساحة"
                  value={`${property.area} م²`}
                  className="hero-reveal"
                  style={{ animationDelay: "400ms" }}
                />
                {property.bedrooms > 0 && (
                  <StatCard
                    icon={<Bed className="h-5 w-5" />}
                    label="غرف النوم"
                    value={`${property.bedrooms}`}
                    className="hero-reveal"
                    style={{ animationDelay: "460ms" }}
                  />
                )}
                {property.bathrooms > 0 && (
                  <StatCard
                    icon={<Bath className="h-5 w-5" />}
                    label="الحمامات"
                    value={`${property.bathrooms}`}
                    className="hero-reveal"
                    style={{ animationDelay: "520ms" }}
                  />
                )}
                {property.floor !== null && property.floor > 0 && (
                  <StatCard
                    icon={<Layers className="h-5 w-5" />}
                    label="الطابق"
                    value={`${property.floor}`}
                    className="hero-reveal"
                    style={{ animationDelay: "580ms" }}
                  />
                )}
              </div>

              <div
                className="hero-reveal mt-6 grid gap-3 sm:grid-cols-2"
                style={{ animationDelay: "640ms" }}
              >
                <LeadButton
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  label="تواصل واتساب الآن"
                  icon={<MessageCircle className="h-5 w-5" />}
                  className="bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-600"
                />
                <LeadButton
                  href={callHref}
                  label={`اتصل الآن: ${phoneDisplay}`}
                  icon={<Phone className="h-5 w-5" />}
                  className="bg-white text-slate-950 hover:bg-slate-100"
                />
              </div>

              <div
                className="hero-reveal mt-4 rounded-[24px] border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(251,191,36,0.08))] p-4 text-sm leading-7 text-amber-100 shadow-[0_18px_60px_-38px_rgba(245,158,11,0.7)]"
                style={{ animationDelay: "700ms" }}
              >
                <span className="font-bold text-amber-300">
                  عدد محدود من الوحدات:
                </span>{" "}
                العقارات الجيدة في هذه المنطقة لا تبقى طويلاً. احجز معاينتك قبل
                أن يسبقك عميل آخر.
              </div>
            </div>

            <div className="hero-reveal relative" style={{ animationDelay: "180ms" }}>
              <div className="hero-float relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-3 shadow-[0_28px_120px_-48px_rgba(15,23,42,0.92)] lg:min-h-[760px]">
                <div className="absolute right-6 top-6 z-10 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white backdrop-blur-md">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                    معرض الوحدة
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {images.length} {images.length === 1 ? "لقطة" : "لقطات"}
                  </p>
                </div>

                <div className="absolute left-6 top-6 z-10 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100 backdrop-blur-md">
                  اضغط على الصورة للتكبير
                </div>

                <div className="relative overflow-hidden rounded-[28px] bg-slate-900">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_40%)]" />
                  <img
                    src={images[activeImage]}
                    alt={property.name}
                    className="hero-ken-burns h-[320px] w-full cursor-zoom-in object-contain bg-slate-950 sm:h-[420px] lg:h-[560px]"
                    onClick={() => setIsImageOpen(true)}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.46))]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.85))]" />

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImage(
                            (prev) =>
                              (prev - 1 + images.length) % images.length,
                          )
                        }
                        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
                        aria-label="الصورة السابقة"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImage((prev) => (prev + 1) % images.length)
                        }
                        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
                        aria-label="الصورة التالية"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg">
                    {activeImage + 1} / {images.length}
                  </div>

                  <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                      سعر العرض
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatPrice(property.price)}
                    </p>
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="mt-3 h-[170px] overflow-y-auto rounded-[24px] border border-white/5 bg-slate-950/50 p-2 sm:h-[182px]">
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                      {images.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveImage(index)}
                          className={`aspect-square w-full overflow-hidden rounded-2xl border-2 transition-all ${
                            index === activeImage
                              ? "scale-[1.03] border-amber-400 shadow-[0_12px_30px_-16px_rgba(245,158,11,0.95)]"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${property.name} ${index + 1}`}
                            className="h-full w-full bg-slate-950 object-contain p-1"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute -bottom-4 left-4 rounded-[24px] bg-white/95 p-4 text-slate-950 shadow-xl backdrop-blur lg:max-w-xs">
                <p className="text-sm font-bold text-amber-600">
                  جاهز للتواصل الآن
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  استفسر عن الحجز، المعاينة، أو أفضل طريقة للدفع مباشرة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {isImageOpen && (
        <ImageLightbox
          images={images}
          initialIndex={activeImage}
          alt={property.name}
          onClose={() => setIsImageOpen(false)}
        />
      )}

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-amber-600">ملخص سريع</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    لماذا هذه الوحدة مناسبة؟
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  كود العقار: {property.property_code || "---"}
                </span>
              </div>

              <p className="mt-5 whitespace-pre-line text-sm leading-8 text-slate-700 sm:text-base">
                {fullDescription}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {property.finishing_status && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <Layers className="mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
                      <div>
                        <p className="font-bold text-slate-900">التشطيب</p>
                        <p className="mt-1 text-sm leading-7 text-slate-600">
                          {property.finishing_status}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {handoverStatus && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <Layers className="mt-1 h-5 w-5 flex-shrink-0 text-sky-600" />
                      <div>
                        <p className="font-bold text-slate-900">الاستلام</p>
                        <p className="mt-1 text-sm leading-7 text-slate-600">
                          {handoverStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Home className="mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="font-bold text-slate-900">العنوان</p>
                      <p className="mt-1 text-sm leading-7 text-slate-600">
                        {addressLabel}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="font-bold text-slate-900">المنطقة</p>
                      <p className="mt-1 text-sm leading-7 text-slate-600">
                        {locationLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 sm:p-7">
              <p className="text-sm font-bold text-amber-700">
                عدد محدود من الوحدات
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                القرار السريع هنا أفضل
              </h2>
              <p className="mt-4 text-sm leading-8 text-slate-700 sm:text-base">
                {urgencyCopy}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <LeadButton
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  label="احجز عبر واتساب"
                  icon={<MessageCircle className="h-5 w-5" />}
                  className="bg-green-500 text-white hover:bg-green-600"
                />
                <LeadButton
                  href={callHref}
                  label="اتصل بالمبيعات"
                  icon={<Phone className="h-5 w-5" />}
                  className="bg-slate-950 text-white hover:bg-slate-800"
                />
              </div>
            </div>

            {videos.length > 0 && (
              <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-amber-600">
                      فيديوهات العقار
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      معاينة مرئية للوحدة
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                    {videos.length} فيديو
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {videos.map((videoUrl, index) => (
                    <div
                      key={`${videoUrl}-${index}`}
                      className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950 shadow-sm"
                    >
                      <video
                        src={videoUrl}
                        controls
                        preload="metadata"
                        className="h-[260px] w-full bg-slate-950 object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">ابدأ الحجز الآن</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {formatPrice(property.price)}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {locationLabel}
                </p>
                <div className="mt-5 space-y-3">
                  <LeadButton
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    label="واتساب"
                    icon={<MessageCircle className="h-5 w-5" />}
                    className="flex w-full bg-green-500 text-white hover:bg-green-600"
                  />
                  <LeadButton
                    href={callHref}
                    label={phoneDisplay}
                    icon={<Phone className="h-5 w-5" />}
                    className="flex w-full bg-slate-950 text-white hover:bg-slate-800"
                  />
                </div>
              </div>

              <div className="rounded-[28px] bg-slate-950 p-6 text-white">
                <p className="text-sm font-bold text-amber-300">
                  جاهز للخطوة التالية؟
                </p>
                <p className="mt-3 text-sm leading-8 text-slate-300">
                  شاركنا ميزانيتك ووقت المعاينة المناسب لك، وسنرتب التواصل
                  مباشرة معك بدون تعقيد.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        className="fixed bottom-24 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl shadow-green-500/30 transition-transform hover:scale-105 lg:bottom-6 lg:left-6"
      >
        <MessageCircle className="h-7 w-7" />
      </a>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
          <LeadButton
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            label="واتساب"
            icon={<MessageCircle className="h-5 w-5" />}
            className="bg-green-500 text-white hover:bg-green-600"
          />
          <LeadButton
            href={callHref}
            label="اتصال"
            icon={<Phone className="h-5 w-5" />}
            className="bg-slate-950 text-white hover:bg-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
