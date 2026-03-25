import {
  Bed,
  Bath,
  Maximize,
  MapPin,
  Home,
  Layers,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Hash,
  ArrowRight,
} from "lucide-react";
import { Property } from "../lib/supabase";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface PropertyDetailsProps {
  property: Property;
}

export const PropertyDetails = ({ property }: PropertyDetailsProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const phoneNumber = "00201002100785";
  const whatsappNumber = "201002100785"; // بدون 00 في البداية للواتساب

  const handleContactUs = () => {
    // عرض رقم الهاتف
    alert(`رقم الهاتف: ${phoneNumber}\n\nسيتم فتح واتساب للتواصل...`);

    // فتح واتساب مع رسالة جاهزة
    const message = `مرحباً، أنا مهتم بالعقار: ${property.name}\nكود العقار: ${property.property_code}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const images =
    property.images && property.images.length > 0
      ? property.images
      : [
          "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // دعم لوحة المفاتيح للتنقل بين الصور
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [property.id]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setCurrentImageIndex(
          (prev) => (prev - 1 + images.length) % images.length,
        );
      } else if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [images.length]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للرئيسية</span>
        </Link>
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              كود العقار: {property.property_code || "---"}
            </span>
            <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              نوع العقار: {property.property_type}
            </span>
            {property.finishing_status && (
              <span className="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
                التشطيب: {property.finishing_status}
              </span>
            )}
            {property.handover_status && (
              <span className="rounded-lg bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
                الاستلام: {property.handover_status}
              </span>
            )}
            <span className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
              الحالة: {property.listing_type}
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">
            {property.name}
          </h1>
          <p className="mb-4 text-lg text-slate-600">
            {property.city} - {property.area_name}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="relative mb-6">
            <div className="relative group">
              <img
                src={images[currentImageIndex]}
                alt={property.name}
                className="w-full h-96 object-contain bg-slate-100 rounded-xl"
              />
              {images.length > 1 && (
                <>
                  {/* زر الصورة السابقة */}
                  <button
                    onClick={prevImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all z-10 shadow-lg hover:scale-110"
                    aria-label="الصورة السابقة"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  {/* زر الصورة التالية */}
                  <button
                    onClick={nextImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all z-10 shadow-lg hover:scale-110"
                    aria-label="الصورة التالية"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  {/* عداد الصور */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 h-[172px] overflow-y-auto rounded-xl bg-slate-50 p-2">
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`aspect-square w-full overflow-hidden rounded-lg border-2 transition-all ${
                        idx === currentImageIndex
                          ? "border-amber-500 scale-105"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${property.name} - ${idx + 1}`}
                        className="h-full w-full bg-slate-100 object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex gap-3 mb-4 flex-wrap">
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {property.property_code || "---"}
                </span>
                <span className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium">
                  {property.listing_type}
                </span>
                <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-medium">
                  {property.property_type}
                </span>
                {property.finishing_status && (
                  <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
                    {property.finishing_status}
                  </span>
                )}
                {property.handover_status && (
                  <span className="px-4 py-2 bg-sky-100 text-sky-700 rounded-lg font-medium">
                    {property.handover_status}
                  </span>
                )}
                {property.featured && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                    مميز
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-600 mb-6">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">{property.address}</span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3">الوصف</h3>
              <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-line">
                {property.description}
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-4">
                المواصفات
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {property.bedrooms > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <Bed className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="text-sm text-slate-500">غرف النوم</p>
                      <p className="text-lg font-bold text-slate-900">
                        {property.bedrooms}
                      </p>
                    </div>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <Bath className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="text-sm text-slate-500">الحمامات</p>
                      <p className="text-lg font-bold text-slate-900">
                        {property.bathrooms}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <Maximize className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="text-sm text-slate-500">المساحة</p>
                    <p className="text-lg font-bold text-slate-900">
                      {property.area} م²
                    </p>
                  </div>
                </div>
                {property.floor !== null && property.floor > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <Layers className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="text-sm text-slate-500">الطابق</p>
                      <p className="text-lg font-bold text-slate-900">
                        {property.floor}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border-2 border-amber-200 sticky top-24">
                <p className="text-sm text-slate-600 mb-2">السعر</p>
                <p className="text-4xl font-bold text-amber-600 mb-6">
                  {property.price.toLocaleString("ar-EG")} جنيه
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Home className="w-5 h-5" />
                    <span>
                      {property.city} - {property.area_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-5 h-5" />
                    <span className="text-sm">{property.address}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleContactUs}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>تواصل عبر واتساب</span>
                  </button>
                  <a
                    href={`tel:${phoneNumber.replace(/\s/g, "")}`}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    <span>اتصل بنا: {phoneNumber}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
