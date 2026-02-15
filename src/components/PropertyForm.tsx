import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase, Property } from '../lib/supabase';
import { getCities, getAreasByCityName, City, Area } from '../lib/citiesAreas';

interface PropertyFormProps {
  property: Property | null;
  onClose: () => void;
}

export const PropertyForm = ({ property, onClose }: PropertyFormProps) => {
  const [loading, setLoading] = useState(false);
  const [nextCode, setNextCode] = useState('');
  const [formData, setFormData] = useState({
    property_code: '',
    name: '',
    description: '',
    property_type: 'شقة',
    listing_type: 'للبيع',
    price: '',
    area: '',
    bedrooms: '2',
    bathrooms: '1',
    floor: '',
    city: 'القاهرة',
    area_name: '',
    address: '',
    latitude: '',
    longitude: '',
    featured: false,
    owner_name: '',
    owner_phone: '',
    original_price: '',
    admin_notes: ''
  });
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // جلب المدن عند تحميل المكون
  useEffect(() => {
    const loadCities = async () => {
      const citiesData = await getCities();
      setCities(citiesData);
    };
    loadCities();
  }, []);

  // جلب المناطق عند تغيير المدينة
  useEffect(() => {
    const loadAreas = async () => {
      if (formData.city) {
        setLoadingAreas(true);
        const areasData = await getAreasByCityName(formData.city);
        setAreas(areasData);
        setLoadingAreas(false);
      } else {
        setAreas([]);
      }
    };
    loadAreas();
  }, [formData.city]);

  useEffect(() => {
    const fetchNextCode = async () => {
      if (!property) {
        const { data, error } = await supabase.rpc('generate_next_property_code');
        if (!error && data) {
          setNextCode(data);
          setFormData(prev => ({ ...prev, property_code: data }));
        }
      }
    };

    if (property) {
      setFormData({
        property_code: property.property_code,
        name: property.name,
        description: property.description,
        property_type: property.property_type,
        listing_type: property.listing_type,
        price: property.price.toString(),
        area: property.area.toString(),
        bedrooms: property.bedrooms.toString(),
        bathrooms: property.bathrooms.toString(),
        floor: property.floor?.toString() || '',
        city: property.city,
        area_name: property.area_name,
        address: property.address,
        latitude: property.latitude?.toString() || '',
        longitude: property.longitude?.toString() || '',
        featured: property.featured,
        owner_name: property.owner_name || '',
        owner_phone: property.owner_phone || '',
        original_price: property.original_price?.toString() || '',
        admin_notes: property.admin_notes || ''
      });
      setImages(property.images || []);
    } else {
      fetchNextCode();
    }
  }, [property]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const propertyData = {
        property_code: formData.property_code,
        name: formData.name,
        description: formData.description,
        property_type: formData.property_type,
        listing_type: formData.listing_type,
        price: parseFloat(formData.price),
        area: parseFloat(formData.area),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        floor: formData.floor ? parseInt(formData.floor) : null,
        city: formData.city,
        area_name: formData.area_name,
        address: formData.address,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        images: images,
        featured: formData.featured,
        owner_name: formData.owner_name || null,
        owner_phone: formData.owner_phone || null,
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        admin_notes: formData.admin_notes || null,
        updated_at: new Date().toISOString()
      };

      if (property) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('properties').insert([propertyData]);
        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('حدث خطأ أثناء حفظ العقار');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex justify-between items-center z-10 rounded-t-2xl">
          <h2 className="text-2xl font-bold">
            {property ? 'تعديل عقار' : 'إضافة عقار جديد'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-amber-900 mb-2">📢 البيانات العامة (ستظهر في الموقع)</h3>
            <p className="text-sm text-amber-700">هذه البيانات ستكون مرئية للجميع ويمكن مشاركتها على فيسبوك وواتساب</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">كود العقار *</label>
            <input
              type="text"
              name="property_code"
              value={formData.property_code}
              onChange={handleChange}
              required
              readOnly={!!property}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-50 font-mono font-bold text-lg text-amber-700"
              placeholder="Horus001"
            />
            {!property && nextCode && (
              <p className="text-xs text-slate-600 mt-1">سيتم إنشاء الكود تلقائياً: {nextCode}</p>
            )}
            {property && (
              <p className="text-xs text-slate-600 mt-1">لا يمكن تعديل كود العقار بعد الإنشاء</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">اسم العقار *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">السعر المعلن (جنيه) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">نوع العقار *</label>
              <select
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="شقة">شقة</option>
                <option value="فيلا">فيلا</option>
                <option value="مكتب">مكتب</option>
                <option value="أرض">أرض</option>
                <option value="محل تجاري">محل تجاري</option>
                <option value="شاليه">شاليه</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">حالة العقار *</label>
              <select
                name="listing_type"
                value={formData.listing_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="للبيع">للبيع</option>
                <option value="للإيجار">للإيجار</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">المساحة (م²) *</label>
              <input
                type="number"
                name="area"
                value={formData.area}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">عدد غرف النوم *</label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">عدد الحمامات *</label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">رقم الطابق</label>
              <input
                type="number"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">المدينة *</label>
              <select
                name="city"
                value={formData.city}
                onChange={(e) => {
                  handleChange(e);
                  // Reset area when city changes
                  setFormData(prev => ({ ...prev, area_name: '' }));
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
              >
                <option value="">اختر المدينة</option>
                {cities.map(city => (
                  <option key={city.id} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">المنطقة *</label>
              <select
                name="area_name"
                value={formData.area_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={!formData.city || loadingAreas}
              >
                <option value="">
                  {loadingAreas ? 'جاري التحميل...' : 'اختر المنطقة'}
                </option>
                {areas.map(area => (
                  <option key={area.id} value={area.name}>{area.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">العنوان الكامل *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">الوصف التفصيلي *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">الصور</label>
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="أدخل رابط الصورة (https://...)"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-6">
            <input
              type="checkbox"
              name="featured"
              id="featured"
              checked={formData.featured}
              onChange={handleChange}
              className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="featured" className="text-sm font-medium text-slate-700">
              ⭐ عقار مميز (سيظهر في أعلى الصفحة الرئيسية)
            </label>
          </div>

          <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-slate-900 mb-2">🔒 البيانات الخاصة (داخلية فقط)</h3>
            <p className="text-sm text-slate-600 mb-4">هذه البيانات لن تظهر في الموقع ولن يتم مشاركتها أبداً</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">اسم المالك</label>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">رقم هاتف المالك</label>
                <input
                  type="tel"
                  name="owner_phone"
                  value={formData.owner_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">السعر الأصلي (جنيه)</label>
                <input
                  type="number"
                  name="original_price"
                  value={formData.original_price}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">ملاحظات الإدارة</label>
                <textarea
                  name="admin_notes"
                  value={formData.admin_notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : property ? 'حفظ التعديلات' : 'إضافة العقار'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
