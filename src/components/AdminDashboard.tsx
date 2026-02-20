import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Edit, Trash2, Facebook, MessageCircle, Eye, Filter, RotateCcw, MapPin } from 'lucide-react';
import { supabase, Property, getPublicPropertyUrl } from '../lib/supabase';
import { PropertyForm } from './PropertyForm';
import { AdminStats } from './AdminStats';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { CitiesAreasManagement } from './CitiesAreasManagement';
import { getAreasByCityName } from '../lib/citiesAreas';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard = ({ onClose }: AdminDashboardProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'cities'>('properties');
  const [areas, setAreas] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: '',
    listingType: '',
    city: '',
    area: ''
  });

  // تفعيل/تعطيل استخدام الإيموجي في رسائل المشاركة
  const USE_EMOJI_IN_SHARING = true;

  // إزالة محارف التنويع التي قد تسبب ظهور � في بعض الأجهزة/التطبيقات
  const sanitizeEmoji = (value: string) => value.replace(/\uFE0F/g, '');

  const EMOJI = {
    house: sanitizeEmoji('🏠'),
    pin: sanitizeEmoji('📍'),
    money: sanitizeEmoji('💵'), // بديل أكثر دعماً من 💰
    ruler: sanitizeEmoji('📐'), // بديل أكثر دعماً من 📏
    bed: sanitizeEmoji('🛏'),
    shower: sanitizeEmoji('🚿'),
    camera: sanitizeEmoji('📷'),
  };

  const applyFilters = useCallback(() => {
    let filtered = [...properties];

    if (filters.propertyType) {
      filtered = filtered.filter(p => p.property_type === filters.propertyType);
    }

    if (filters.listingType) {
      filtered = filtered.filter(p => p.listing_type === filters.listingType);
    }

    if (filters.city) {
      filtered = filtered.filter(p => p.city === filters.city);
    }

    if (filters.area) {
      filtered = filtered.filter(p => p.area_name === filters.area);
    }

    setFilteredProperties(filtered);
  }, [filters, properties]);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // جلب المناطق عند تغيير المدينة
  useEffect(() => {
    const loadAreas = async () => {
      if (filters.city) {
        setLoadingAreas(true);
        const areasData = await getAreasByCityName(filters.city);
        setAreas(areasData);
        setLoadingAreas(false);
      } else {
        setAreas([]);
      }
    };
    loadAreas();
  }, [filters.city]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
      setFilteredProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };



  const resetFilters = () => {
    setFilters({
      propertyType: '',
      listingType: '',
      city: '',
      area: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return;

    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      await loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('حدث خطأ أثناء حذف العقار');
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProperty(null);
    loadProperties();
  };

  // تنسيق أرقام آمن للمشاركة لتجنّب محارف غير مدعومة في بعض تطبيقات المراسلة
  const formatNumberForSharing = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        useGrouping: true,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return String(value);
    }
  };

  const shareToFacebook = (property: Property) => {
    const url = getPublicPropertyUrl(property.id);
    const firstImage = property.images && property.images.length > 0 ? property.images[0] : '';
    const imageLine = firstImage
      ? `\n${USE_EMOJI_IN_SHARING ? `${EMOJI.camera} ` : ''}الصورة: ${firstImage}`
      : '';
    const header = USE_EMOJI_IN_SHARING
      ? `${EMOJI.house} ${property.name}`
      : `${property.name}`;
    const locationLine = `${USE_EMOJI_IN_SHARING ? `${EMOJI.pin} ` : ''}${property.city} - ${property.area_name}`;
    const priceLine = `${USE_EMOJI_IN_SHARING ? `${EMOJI.money} ` : ''}${formatNumberForSharing(property.price)} جنيه`;
    const text = `${header}\n${locationLine}\n${priceLine}\n${property.description.substring(0, 100)}...${imageLine}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareToWhatsApp = (property: Property) => {
    const url = getPublicPropertyUrl(property.id);
    const firstImage = property.images && property.images.length > 0 ? property.images[0] : '';
    const imageLine = firstImage ? `\n${USE_EMOJI_IN_SHARING ? `${EMOJI.camera} ` : ''}صورة: ${firstImage}\n` : '';
    const title = USE_EMOJI_IN_SHARING ? `${EMOJI.house} *${property.name}*` : `*${property.name}*`;
    const locationLine = `${USE_EMOJI_IN_SHARING ? `${EMOJI.pin} ` : ''}الموقع: ${property.city} - ${property.area_name}`;
    const priceLine = `${USE_EMOJI_IN_SHARING ? `${EMOJI.money} ` : ''}السعر: ${formatNumberForSharing(property.price)} جنيه`;
    const areaLine = `${USE_EMOJI_IN_SHARING ? `${EMOJI.ruler} ` : ''}المساحة: ${property.area} م2`;
    const bedsLine = `${USE_EMOJI_IN_SHARING ? `${EMOJI.bed} ` : ''}غرف النوم: ${property.bedrooms}`;
    const bathsLine = `${USE_EMOJI_IN_SHARING ? `${EMOJI.shower} ` : ''}الحمامات: ${property.bathrooms}`;
    const text = `${title}\n\n${locationLine}\n${priceLine}\n${areaLine}\n${bedsLine}\n${bathsLine}${imageLine}\n${property.description}\n\nللمزيد من التفاصيل: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (showForm) {
    return <PropertyForm property={editingProperty} onClose={handleFormClose} />;
  }

  if (viewingProperty) {
    return <PropertyDetailsModal property={viewingProperty} onClose={() => setViewingProperty(null)} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex justify-between items-center z-10 rounded-t-2xl">
          <h2 className="text-2xl font-bold">لوحة التحكم الإدارية</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <AdminStats />

          {/* التبويبات */}
          <div className="mb-6 bg-white rounded-xl shadow-lg p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('properties')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'properties'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-5 h-5" />
                <span>العقارات</span>
              </button>
              <button
                onClick={() => setActiveTab('cities')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'cities'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span>المدن والمناطق</span>
              </button>
            </div>
          </div>

          {/* محتوى التبويبات */}
          {activeTab === 'cities' ? (
            <CitiesAreasManagement />
          ) : (
            <>
              <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl font-bold"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة عقار جديد</span>
            </button>
          </div>

          <div className="mb-6 bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-700" />
              <h3 className="text-lg font-bold text-slate-900">تصفية العقارات</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">نوع العقار</label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="شقة">شقة</option>
                  <option value="فيلا">فيلا</option>
                  <option value="مكتب">مكتب</option>
                  <option value="أرض">أرض</option>
                  <option value="محل تجاري">محل تجاري</option>
                  <option value="شاليه">شاليه</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">حالة العقار</label>
                <select
                  value={filters.listingType}
                  onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                >
                  <option value="">الكل</option>
                  <option value="للبيع">للبيع</option>
                  <option value="للإيجار">للإيجار</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">المدينة</label>
                <select
                  value={filters.city}
                  onChange={(e) => {
                    setFilters({ ...filters, city: e.target.value, area: '' });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                >
                  <option value="">جميع المدن</option>
                  <option value="القاهرة">القاهرة</option>
                  <option value="الجيزة">الجيزة</option>
                  <option value="الإسكندرية">الإسكندرية</option>
                  <option value="الغردقة">الغردقة</option>
                  <option value="شرم الشيخ">شرم الشيخ</option>
                  <option value="العين السخنة">العين السخنة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">المنطقة</label>
                <select
                  value={filters.area}
                  onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  disabled={!filters.city || loadingAreas}
                >
                  <option value="">
                    {loadingAreas ? 'جاري التحميل...' : 'جميع المناطق'}
                  </option>
                  {areas.map(area => (
                    <option key={area.id} value={area.name}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة تعيين</span>
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <span className="font-bold text-slate-900">{filteredProperties.length}</span> من {properties.length} عقار
              </p>
              {(filters.propertyType || filters.listingType || filters.city || filters.area) && (
                <div className="flex flex-wrap gap-2">
                  {filters.propertyType && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      {filters.propertyType}
                    </span>
                  )}
                  {filters.listingType && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                      {filters.listingType}
                    </span>
                  )}
                  {filters.city && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {filters.city}
                    </span>
                  )}
                  {filters.area && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {filters.area}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-600 mx-auto mb-4"></div>
              <p className="text-slate-600">جاري التحميل...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <p className="text-slate-600 text-lg">لا توجد عقارات تطابق الفلاتر</p>
              <p className="text-slate-500 text-sm mt-2">جرب تغيير خيارات البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex gap-4">
                    <img
                      src={property.images && property.images.length > 0 ? property.images[0] : 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=300'}
                      alt={property.name}
                      className="w-32 h-32 object-contain bg-slate-100 rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-mono font-bold">
                              {property.property_code}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">{property.name}</h3>
                          <p className="text-slate-600">{property.city} - {property.area_name}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {property.listing_type}
                          </span>
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                            {property.property_type}
                          </span>
                          {property.featured && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              مميز
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-amber-600 mb-3">
                        {property.price.toLocaleString('ar-EG')} جنيه
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setViewingProperty(property)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm shadow-md"
                        >
                          <Eye className="w-4 h-4" />
                          <span>عرض التفاصيل</span>
                        </button>
                        <button
                          onClick={() => handleEdit(property)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleDelete(property.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف</span>
                        </button>
                        <button
                          onClick={() => shareToFacebook(property)}
                          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                          style={{ backgroundColor: '#1877F2' }}
                        >
                          <Facebook className="w-4 h-4" />
                          <span>مشاركة على فيسبوك</span>
                        </button>
                        <button
                          onClick={() => shareToWhatsApp(property)}
                          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>مشاركة على واتساب</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
