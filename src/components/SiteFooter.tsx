export const SiteFooter = () => {
  return (
    <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-12 mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">عقارات حورس</h3>
          <p className="text-slate-300 mb-4">منصتك الموثوقة للعقارات</p>
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            <a
              href="https://wa.me/201002100785"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              <span>💬</span>
              <span>تواصل معنا عبر واتساب</span>
            </a>
            <a
              href="https://t.me/horusgroupbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              <span>✈️</span>
              <span>تواصل عبر البوت</span>
            </a>
            <a
              href="tel:00201002100785"
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              <span>📞</span>
              <span>اتصل بنا: 201002100785</span>
            </a>
          </div>
          <div className="flex justify-center gap-8 mb-6 text-sm text-slate-400">
            <span>📞 خدمة العملاء</span>
            <span>📧 البريد الإلكتروني</span>
            <span>📍 المواقع</span>
          </div>
          <p className="text-slate-400 text-sm">جميع الحقوق محفوظة © 2025</p>
        </div>
      </div>
    </footer>
  );
};
