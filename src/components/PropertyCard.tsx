import { Bed, Bath, MapPin, Maximize, Hash } from 'lucide-react';
import { Property } from '../lib/supabase';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
}

export const PropertyCard = ({ property, onClick }: PropertyCardProps) => {
  const mainImage = property.images && property.images.length > 0
    ? property.images[0]
    : 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
    >
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img
          src={mainImage}
          alt={property.name}
          className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-95"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-sm font-medium shadow-lg">
            {property.listing_type}
          </span>
          {property.featured && (
            <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-medium shadow-lg">
              مميز
            </span>
          )}
        </div>
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white text-slate-900 rounded-full text-sm font-bold shadow-lg">
            {property.property_type}
          </span>
        </div>
        <div className="absolute bottom-4 right-4">
          <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-1">
            <Hash className="w-4 h-4" />
            {property.property_code || "---"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">
          {property.name}
        </h3>

        <div className="flex items-center gap-2 text-slate-600 mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{property.city} - {property.area_name}</span>
        </div>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {property.description}
        </p>

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1 text-slate-600">
                <Bed className="w-5 h-5" />
                <span className="text-sm font-medium">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center gap-1 text-slate-600">
                <Bath className="w-5 h-5" />
                <span className="text-sm font-medium">{property.bathrooms}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-slate-600">
              <Maximize className="w-5 h-5" />
              <span className="text-sm font-medium">{property.area} م²</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">السعر</p>
            <p className="text-2xl font-bold text-amber-600">
              {property.price.toLocaleString('ar-EG')} جنيه
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
};
