import { useState, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Routes, Route } from "react-router-dom";
import { supabase, Property } from "./lib/supabase";
import { AuthProvider } from "./contexts/AuthContext";
import { Navbar } from "./components/Navbar";
import { SearchFilters } from "./components/SearchFilters";
import { PropertyCard } from "./components/PropertyCard";
import { PropertyDetails } from "./components/PropertyDetails";
import { admin } from "./pages/admin";
import { login } from "./pages/login";

function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [filters, setFilters] = useState({
    propertyCode: "",
    city: "",
    area: "",
    propertyType: "",
    listingType: "",
    minPrice: "",
    maxPrice: "",
    minArea: "",
    bedrooms: "",
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
      setFilteredProperties(data || []);
    } catch (error) {
      console.error("Error loading properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    let filtered = [...properties];

    if (filters.propertyCode) {
      filtered = filtered.filter((p) =>
        p.property_code
          .toLowerCase()
          .includes(filters.propertyCode.toLowerCase())
      );
    }

    if (filters.city) {
      filtered = filtered.filter((p) => p.city === filters.city);
    }

    if (filters.area) {
      filtered = filtered.filter((p) => p.area_name === filters.area);
    }

    if (filters.propertyType) {
      filtered = filtered.filter(
        (p) => p.property_type === filters.propertyType
      );
    }

    if (filters.listingType) {
      filtered = filtered.filter((p) => p.listing_type === filters.listingType);
    }

    if (filters.minPrice) {
      filtered = filtered.filter(
        (p) => p.price >= parseFloat(filters.minPrice)
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(
        (p) => p.price <= parseFloat(filters.maxPrice)
      );
    }

    if (filters.minArea) {
      filtered = filtered.filter((p) => p.area >= parseFloat(filters.minArea));
    }

    if (filters.bedrooms) {
      const bedCount = parseInt(filters.bedrooms);
      if (bedCount === 4) {
        filtered = filtered.filter((p) => p.bedrooms >= 4);
      } else {
        filtered = filtered.filter((p) => p.bedrooms === bedCount);
      }
    }

    setFilteredProperties(filtered);
  };

  // تقسيم العقارات إلى أقسام
  // قسم الإعلانات المميزة: أول 3 إعلانات مميزة
  const featuredProperties = properties.filter((p) => p.featured).slice(0, 3);
  const featuredIds = new Set(featuredProperties.map((p) => p.id));

  // قسم أحدث الإعلانات: 6 أحدث إعلانات مرتبة حسب التاريخ (باستثناء المميزة المعروضة)
  const latestProperties = properties
    .filter((p) => !featuredIds.has(p.id))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 6);

  // قسم جميع الإعلانات: جميع الإعلانات مرتبة حسب التاريخ (بما في ذلك المميزة)
  const allOtherProperties = [...properties].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white py-24 mb-12 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMCAwdjRoNHYtNGgtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 animate-fade-in">
              اكتشف عقار أحلامك
            </h1>
            <p className="text-xl text-slate-200 max-w-2xl mx-auto">
              آلاف العقارات المميزة للبيع والإيجار في أفضل مواقع مصر بأسعار
              تنافسية
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <SearchFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
        />

        {/* عرض نتائج البحث إذا كان هناك بحث نشط */}
        {filteredProperties.length !== properties.length ? (
          <>
            {filteredProperties.length > 0 ? (
              <div className="mb-12 mt-12">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      نتائج البحث
                    </h2>
                    <p className="text-slate-600">
                      {filteredProperties.length} عقار متاح
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFilters({
                        propertyCode: "",
                        city: "",
                        area: "",
                        propertyType: "",
                        listingType: "",
                        minPrice: "",
                        maxPrice: "",
                        minArea: "",
                        bedrooms: "",
                      });
                      setFilteredProperties(properties);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    إعادة تعيين البحث
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onClick={() => setSelectedProperty(property)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-lg mt-12">
                <div className="text-6xl mb-4">🏠</div>
                <p className="text-slate-600 text-xl mb-2">
                  لا توجد عقارات تطابق البحث
                </p>
                <p className="text-slate-500 mb-4">جرب تغيير معايير البحث</p>
                <button
                  onClick={() => {
                    setFilters({
                      propertyCode: "",
                      city: "",
                      area: "",
                      propertyType: "",
                      listingType: "",
                      minPrice: "",
                      maxPrice: "",
                      minArea: "",
                      bedrooms: "",
                    });
                    setFilteredProperties(properties);
                  }}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
                >
                  عرض جميع العقارات
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* قسم الإعلانات المميزة */}
            {featuredProperties.length > 0 && (
              <div className="mt-12 mb-12">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    إعلانات مميزة
                  </h2>
                  <p className="text-slate-600">
                    أفضل العقارات المختارة خصيصاً لك
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onClick={() => setSelectedProperty(property)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* قسم أحدث الإعلانات */}
            {latestProperties.length > 0 && (
              <div className="mb-12">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    أحدث الإعلانات
                  </h2>
                  <p className="text-slate-600">آخر العقارات المضافة</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {latestProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onClick={() => setSelectedProperty(property)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* قسم جميع الإعلانات */}
            {allOtherProperties.length > 0 && (
              <div className="mb-12">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    جميع الإعلانات
                  </h2>
                  <p className="text-slate-600">
                    {allOtherProperties.length} عقار متاح
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allOtherProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onClick={() => setSelectedProperty(property)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* حالة عدم وجود عقارات */}
            {properties.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl shadow-lg mt-12">
                <div className="text-6xl mb-4">🏠</div>
                <p className="text-slate-600 text-xl mb-2">
                  لا توجد عقارات متاحة حالياً
                </p>
                <p className="text-slate-500">سيتم إضافة عقارات جديدة قريباً</p>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">عقارات حورس</h3>
            <p className="text-slate-300 mb-4">منصتك الموثوقة للعقارات</p>
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
              <a
                href="https://wa.me/201140929451"
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
                href="tel:00201140929451"
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                <span>📞</span>
                <span>اتصل بنا: 00201140929451</span>
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

      {selectedProperty && (
        <PropertyDetails
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<login />} />
      <Route path="/admin" element={<admin />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <SpeedInsights />
    </AuthProvider>
  );
}

export default App;
