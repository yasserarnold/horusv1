import { X, MapPin, Bed, Bath, Square, Calendar, User, Phone, DollarSign, StickyNote, Eye } from 'lucide-react';
import { Property } from '../lib/supabase';

interface PropertyDetailsModalProps {
  property: Property;
  onClose: () => void;
}

export const PropertyDetailsModal = ({ property, onClose }: PropertyDetailsModalProps) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex justify-between items-center z-10 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold mb-1">تفاصيل العقار الكاملة</h2>
            <p className="text-slate-300 text-sm">جميع البيانات العامة والخاصة</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {property.images && property.images.length > 0 && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${property.name} - صورة ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg shadow-md"
                />
              ))}
            </div>
          )}

          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-r-4 border-amber-500 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-mono font-bold">
                {property.property_code}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{property.name}</h3>
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-5 h-5 text-amber-600" />
              <span className="font-medium">{property.city} - {property.area_name}</span>
            </div>
            <p className="text-slate-600 mt-2 text-sm">{property.address}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border-2 border-slate-200 rounded-xl p-5">
              <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-slate-600" />
                البيانات العامة
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">نوع العقار:</span>
                  <span className="text-slate-900 font-bold px-3 py-1 bg-amber-100 rounded-full text-sm">
                    {property.property_type}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">حالة العقار:</span>
                  <span className="text-slate-900 font-bold px-3 py-1 bg-slate-100 rounded-full text-sm">
                    {property.listing_type}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    السعر المعلن:
                  </span>
                  <span className="text-amber-600 font-bold text-xl">
                    {property.price.toLocaleString('ar-EG')} جنيه
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    المساحة:
                  </span>
                  <span className="text-slate-900 font-bold">
                    {property.area} م²
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium flex items-center gap-2">
                    <Bed className="w-4 h-4" />
                    غرف النوم:
                  </span>
                  <span className="text-slate-900 font-bold">{property.bedrooms}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium flex items-center gap-2">
                    <Bath className="w-4 h-4" />
                    الحمامات:
                  </span>
                  <span className="text-slate-900 font-bold">{property.bathrooms}</span>
                </div>
                {property.floor !== null && property.floor !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">الطابق:</span>
                    <span className="text-slate-900 font-bold">{property.floor}</span>
                  </div>
                )}
                {property.featured && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600 font-medium">عقار مميز:</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                      ✓ نعم
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
              <h4 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-red-600" />
                البيانات الخاصة (لا تُشارك)
              </h4>
              <div className="space-y-3">
                {property.owner_name && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <span className="text-slate-600 font-medium flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-red-600" />
                      اسم المالك:
                    </span>
                    <span className="text-slate-900 font-bold block">{property.owner_name}</span>
                  </div>
                )}
                {property.owner_phone && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <span className="text-slate-600 font-medium flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-red-600" />
                      رقم التواصل:
                    </span>
                    <a
                      href={`tel:${property.owner_phone}`}
                      className="text-blue-600 font-bold block hover:underline"
                      dir="ltr"
                    >
                      {property.owner_phone}
                    </a>
                  </div>
                )}
                {property.original_price && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <span className="text-slate-600 font-medium flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-red-600" />
                      السعر الأصلي:
                    </span>
                    <span className="text-red-600 font-bold text-lg block">
                      {property.original_price.toLocaleString('ar-EG')} جنيه
                    </span>
                    {property.price !== property.original_price && (
                      <span className="text-green-600 text-sm block mt-1">
                        الفارق: {(property.price - property.original_price).toLocaleString('ar-EG')} جنيه
                      </span>
                    )}
                  </div>
                )}
                {property.admin_notes && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <span className="text-slate-600 font-medium flex items-center gap-2 mb-1">
                      <StickyNote className="w-4 h-4 text-red-600" />
                      ملاحظات الإدارة:
                    </span>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{property.admin_notes}</p>
                  </div>
                )}
                {!property.owner_name && !property.owner_phone && !property.original_price && !property.admin_notes && (
                  <div className="text-center py-4 text-slate-500">
                    لا توجد بيانات خاصة مسجلة
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
            <h4 className="text-lg font-bold text-slate-900 mb-3">الوصف التفصيلي</h4>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{property.description}</p>
          </div>

          {(property.latitude && property.longitude) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                الإحداثيات الجغرافية
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-600 text-sm">خط العرض:</span>
                  <p className="font-mono text-slate-900 font-bold">{property.latitude}</p>
                </div>
                <div>
                  <span className="text-slate-600 text-sm">خط الطول:</span>
                  <p className="font-mono text-slate-900 font-bold">{property.longitude}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              معلومات النظام
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-600 text-sm">تاريخ الإنشاء:</span>
                <p className="text-slate-900 font-bold">{formatDate(property.created_at)}</p>
              </div>
              <div>
                <span className="text-slate-600 text-sm">آخر تحديث:</span>
                <p className="text-slate-900 font-bold">{formatDate(property.updated_at)}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-600 text-sm">المعرف الفريد (ID):</span>
                <p className="font-mono text-xs text-slate-500 break-all">{property.id}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all font-bold shadow-lg"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
