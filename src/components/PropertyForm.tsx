import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase, Property } from '../lib/supabase';
import {
  deletePropertyMediaUrls,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_PROPERTY_VIDEOS,
  MAX_VIDEO_UPLOAD_BYTES,
  uploadPropertyMediaFiles,
} from '../lib/propertyMedia';
import { getCities, getAreasByCityName, City, Area } from '../lib/citiesAreas';
import { FINISHING_STATUS_OPTIONS, HANDOVER_STATUS_OPTIONS } from '../lib/propertyOptions';

interface PropertyFormProps {
  property: Property | null;
  onClose: () => void;
}

interface PendingMediaUpload {
  id: string;
  file: File;
  previewUrl: string;
}

const createInitialFormData = (property: Property | null) => ({
  property_code: property?.property_code || '',
  name: property?.name || '',
  description: property?.description || '',
  property_type: property?.property_type || 'شقة',
  listing_type: property?.listing_type || 'للبيع',
  finishing_status: property?.finishing_status || '',
  handover_status: property?.handover_status || '',
  price: property ? property.price.toString() : '',
  area: property ? property.area.toString() : '',
  bedrooms: property ? property.bedrooms.toString() : '2',
  bathrooms: property ? property.bathrooms.toString() : '1',
  floor: property?.floor?.toString() || '',
  city: property?.city || 'القاهرة',
  area_name: property?.area_name || '',
  address: property?.address || '',
  latitude: property?.latitude?.toString() || '',
  longitude: property?.longitude?.toString() || '',
  featured: property?.featured || false,
  owner_name: property?.owner_name || '',
  owner_phone: property?.owner_phone || '',
  original_price: property?.original_price?.toString() || '',
  admin_notes: property?.admin_notes || '',
});

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
};

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const createPendingUpload = (file: File): PendingMediaUpload => ({
  id: crypto.randomUUID(),
  file,
  previewUrl: URL.createObjectURL(file),
});

const revokePendingUploads = (uploads: PendingMediaUpload[]) => {
  uploads.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
};

export const PropertyForm = ({ property, onClose }: PropertyFormProps) => {
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [formData, setFormData] = useState(() => createInitialFormData(property));
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [pendingImageUploads, setPendingImageUploads] = useState<PendingMediaUpload[]>([]);
  const [pendingVideoUploads, setPendingVideoUploads] = useState<PendingMediaUpload[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const imageUploadsRef = useRef<PendingMediaUpload[]>([]);
  const videoUploadsRef = useRef<PendingMediaUpload[]>([]);

  useEffect(() => {
    imageUploadsRef.current = pendingImageUploads;
  }, [pendingImageUploads]);

  useEffect(() => {
    videoUploadsRef.current = pendingVideoUploads;
  }, [pendingVideoUploads]);

  useEffect(() => {
    return () => {
      revokePendingUploads(imageUploadsRef.current);
      revokePendingUploads(videoUploadsRef.current);
    };
  }, []);

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
    let isActive = true;

    const loadAreas = async () => {
      const cityName = formData.city.trim();

      if (!cityName) {
        setAreas([]);
        setLoadingAreas(false);
        return;
      }

      setLoadingAreas(true);
      const areasData = await getAreasByCityName(cityName);

      if (!isActive) {
        return;
      }

      const selectedAreaName = formData.area_name.trim();
      const hasSelectedArea = selectedAreaName
        ? areasData.some((area) => area.name === selectedAreaName)
        : true;

      setAreas(
        hasSelectedArea
          ? areasData
          : [
              {
                id: `legacy-area-${cityName}-${selectedAreaName}`,
                city_id: '',
                name: selectedAreaName,
                created_at: '',
                updated_at: '',
              },
              ...areasData,
            ],
      );
      setLoadingAreas(false);
    };

    loadAreas();

    return () => {
      isActive = false;
    };
  }, [formData.city]);

  useEffect(() => {
    revokePendingUploads(imageUploadsRef.current);
    revokePendingUploads(videoUploadsRef.current);
    setPendingImageUploads([]);
    setPendingVideoUploads([]);

    if (property) {
      setFormData(createInitialFormData(property));
      setImages(property.images || []);
      setVideos(property.videos || []);
      return;
    }

    setFormData(createInitialFormData(null));
    setImages([]);
    setVideos([]);
  }, [property]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAddImage = () => {
    const trimmedUrl = newImageUrl.trim();

    if (!trimmedUrl) {
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      alert('أدخل رابط صورة صحيح يبدأ بـ http أو https');
      return;
    }

    setImages(prev => [...prev, trimmedUrl]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemovePendingImage = (id: string) => {
    setPendingImageUploads(prev => {
      const upload = prev.find(item => item.id === id);
      if (upload) {
        URL.revokeObjectURL(upload.previewUrl);
      }

      return prev.filter(item => item.id !== id);
    });
  };

  const handleRemovePendingVideo = (id: string) => {
    setPendingVideoUploads(prev => {
      const upload = prev.find(item => item.id === id);
      if (upload) {
        URL.revokeObjectURL(upload.previewUrl);
      }

      return prev.filter(item => item.id !== id);
    });
  };

  const handleImageUploadSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    const nextUploads: PendingMediaUpload[] = [];
    const validationErrors: string[] = [];

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        validationErrors.push(`الملف "${file.name}" ليس صورة.`);
        return;
      }

      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        validationErrors.push(`الصورة "${file.name}" أكبر من ${formatFileSize(MAX_IMAGE_UPLOAD_BYTES)}.`);
        return;
      }

      nextUploads.push(createPendingUpload(file));
    });

    if (nextUploads.length > 0) {
      setPendingImageUploads(prev => [...prev, ...nextUploads]);
    }

    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
    }

    e.target.value = '';
  };

  const handleVideoUploadSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    const validationErrors: string[] = [];
    const nextUploads: PendingMediaUpload[] = [];
    const availableSlots = MAX_PROPERTY_VIDEOS - videos.length - pendingVideoUploads.length;

    if (availableSlots <= 0) {
      alert(`يمكن إضافة ${MAX_PROPERTY_VIDEOS} فيديو فقط لكل عقار.`);
      e.target.value = '';
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('video/')) {
        validationErrors.push(`الملف "${file.name}" ليس فيديو.`);
        return;
      }

      if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
        validationErrors.push(`الفيديو "${file.name}" أكبر من ${formatFileSize(MAX_VIDEO_UPLOAD_BYTES)}.`);
        return;
      }

      if (nextUploads.length >= availableSlots) {
        validationErrors.push(`الحد الأقصى للفيديوهات هو ${MAX_PROPERTY_VIDEOS}.`);
        return;
      }

      nextUploads.push(createPendingUpload(file));
    });

    if (nextUploads.length > 0) {
      setPendingVideoUploads(prev => [...prev, ...nextUploads]);
    }

    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
    }

    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalVideos = videos.length + pendingVideoUploads.length;
    if (totalVideos > MAX_PROPERTY_VIDEOS) {
      alert(`يمكن حفظ ${MAX_PROPERTY_VIDEOS} فيديو فقط لكل عقار.`);
      return;
    }

    setLoading(true);
    setSaveMessage('جاري تجهيز البيانات...');

    try {
      const propertyId = property?.id || crypto.randomUUID();
      const finalImages = [...images];
      const finalVideos = [...videos];
      const removedImageUrls = property?.images?.filter(url => !finalImages.includes(url)) || [];
      const removedVideoUrls = property?.videos?.filter(url => !finalVideos.includes(url)) || [];

      if (pendingImageUploads.length > 0) {
        setSaveMessage('جاري رفع الصور...');
        const uploadedImages = await uploadPropertyMediaFiles({
          files: pendingImageUploads.map(item => item.file),
          folder: 'images',
          propertyId,
        });
        finalImages.push(...uploadedImages);
      }

      if (pendingVideoUploads.length > 0) {
        setSaveMessage('جاري رفع الفيديوهات...');
        const uploadedVideos = await uploadPropertyMediaFiles({
          files: pendingVideoUploads.map(item => item.file),
          folder: 'videos',
          propertyId,
        });
        finalVideos.push(...uploadedVideos);
      }

      setSaveMessage('جاري حفظ العقار...');

      const propertyData = {
        name: formData.name,
        description: formData.description,
        property_type: formData.property_type,
        listing_type: formData.listing_type,
        finishing_status: formData.finishing_status || null,
        handover_status: formData.handover_status || null,
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
        images: finalImages,
        videos: finalVideos,
        featured: formData.featured,
        owner_name: formData.owner_name || null,
        owner_phone: formData.owner_phone || null,
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        admin_notes: formData.admin_notes || null,
        ...(formData.property_code.trim()
          ? { property_code: formData.property_code.trim() }
          : {}),
        ...(!property ? { id: propertyId } : {}),
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

      if (removedImageUrls.length > 0 || removedVideoUrls.length > 0) {
        void deletePropertyMediaUrls([...removedImageUrls, ...removedVideoUrls]).catch((cleanupError) => {
          console.error('Error deleting removed property media:', cleanupError);
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('حدث خطأ أثناء حفظ العقار أو رفع الوسائط. تأكد من تشغيل migration الخاصة بالوسائط في Supabase.');
    } finally {
      setLoading(false);
      setSaveMessage('');
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
              readOnly
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-50 font-mono font-bold text-lg text-amber-700"
              placeholder="Horus001"
            />
            {!property && (
              <p className="text-xs text-slate-600 mt-1">سيتم إنشاء الكود تلقائياً عند الحفظ.</p>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">التشطيب *</label>
              <select
                name="finishing_status"
                value={formData.finishing_status}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">اختر التشطيب</option>
                {FINISHING_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">الاستلام *</label>
              <select
                name="handover_status"
                value={formData.handover_status}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">اختر حالة الاستلام</option>
                {HANDOVER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
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

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">الصور</label>
                <p className="text-xs text-slate-500 mt-1">يمكنك رفع صور حتى 5 ميجا للصورة الواحدة أو إضافة روابط مباشرة.</p>
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                الحد الأقصى للصورة: {formatFileSize(MAX_IMAGE_UPLOAD_BYTES)}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 mb-4">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="أدخل رابط الصورة (https://...)"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة رابط</span>
              </button>
            </div>

            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUploadSelection}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
              />
              <p className="text-xs text-slate-500 mt-2">الصور المختارة سترفع إلى التخزين عند الضغط على حفظ.</p>
            </div>

            {images.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-2">الصور الحالية</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((img, idx) => (
                    <div key={`${img}-${idx}`} className="relative group border border-slate-200 rounded-lg bg-white overflow-hidden">
                      <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-24 object-contain bg-slate-100 rounded-lg" />
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
              </div>
            )}

            {pendingImageUploads.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">صور جاهزة للرفع</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {pendingImageUploads.map((upload) => (
                    <div key={upload.id} className="relative group border border-dashed border-amber-300 rounded-lg bg-white overflow-hidden">
                      <img src={upload.previewUrl} alt={upload.file.name} className="w-full h-24 object-contain bg-slate-100 rounded-lg" />
                      <div className="px-2 py-2 text-xs text-slate-600 truncate">{upload.file.name}</div>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingImage(upload.id)}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">الفيديوهات</label>
                <p className="text-xs text-slate-500 mt-1">يمكن رفع حتى {MAX_PROPERTY_VIDEOS} فيديو فقط، بحد أقصى 10 ميجا للفيديو الواحد.</p>
              </div>
              <span className="text-xs font-medium text-sky-700 bg-sky-100 px-3 py-1 rounded-full">
                {videos.length + pendingVideoUploads.length} / {MAX_PROPERTY_VIDEOS}
              </span>
            </div>

            <div className="mb-4">
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoUploadSelection}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
              />
              <p className="text-xs text-slate-500 mt-2">الحد الأقصى للفيديو الواحد: {formatFileSize(MAX_VIDEO_UPLOAD_BYTES)}.</p>
            </div>

            {videos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-2">الفيديوهات الحالية</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((videoUrl, idx) => (
                    <div key={`${videoUrl}-${idx}`} className="relative group rounded-lg border border-slate-200 bg-white p-2">
                      <video src={videoUrl} controls preload="metadata" className="w-full h-52 rounded-lg bg-slate-950" />
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(idx)}
                        className="absolute top-4 right-4 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingVideoUploads.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">فيديوهات جاهزة للرفع</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingVideoUploads.map((upload) => (
                    <div key={upload.id} className="relative group rounded-lg border border-dashed border-sky-300 bg-white p-2">
                      <video src={upload.previewUrl} controls preload="metadata" className="w-full h-52 rounded-lg bg-slate-950" />
                      <div className="px-1 pt-2 text-xs text-slate-600 truncate">
                        {upload.file.name} ({formatFileSize(upload.file.size)})
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingVideo(upload.id)}
                        className="absolute top-4 right-4 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
              {loading ? (saveMessage || 'جاري الحفظ...') : property ? 'حفظ التعديلات' : 'إضافة العقار'}
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
