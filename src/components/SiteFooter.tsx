import { MessageCircle, Phone } from "lucide-react";
import {
  SALES_PHONE_DISPLAY,
  SALES_PHONE_NUMBER,
  buildWhatsAppUrl,
} from "../lib/contact";

export const SiteFooter = () => {
  const whatsappHref = buildWhatsAppUrl(
    "مرحباً، أريد الاستفسار عن العقارات المتاحة حالياً.",
  );

  return (
    <footer className="mt-16 bg-slate-950 text-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-white/5 px-6 py-10 text-center shadow-2xl shadow-slate-950/30">
          <p className="text-sm font-bold text-amber-300">تواصل مباشر</p>
          <h3 className="mt-2 text-3xl font-black">جاهز للحجز أو المعاينة؟</h3>
          <p className="mt-3 text-sm leading-8 text-slate-300 sm:text-base">
            تواصل معنا الآن وسنساعدك في اختيار الوحدة المناسبة وترتيب المعاينة
            بسرعة.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500 px-6 py-4 font-bold text-white transition-colors hover:bg-green-600"
            >
              <MessageCircle className="h-5 w-5" />
              <span>تواصل عبر واتساب</span>
            </a>
            <a
              href={`tel:${SALES_PHONE_NUMBER}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-bold text-slate-950 transition-colors hover:bg-slate-100"
            >
              <Phone className="h-5 w-5" />
              <span>اتصل الآن: {SALES_PHONE_DISPLAY}</span>
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            جميع الحقوق محفوظة © {new Date().getFullYear()} عقارات حورس
          </p>
        </div>
      </div>
    </footer>
  );
};
