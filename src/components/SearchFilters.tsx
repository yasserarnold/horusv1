import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getCities, getAreasByCityName, City, Area } from '../lib/citiesAreas';

interface SearchFiltersProps {
  filters: {
    propertyCode: string;
    city: string;
    area: string;
    propertyType: string;
    listingType: string;
    minPrice: string;
    maxPrice: string;
    minArea: string;
    bedrooms: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onSearch: () => void;
}

export const SearchFilters = ({ filters, onFilterChange, onSearch }: SearchFiltersProps) => {
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const propertyTypes = ['', 'شقة', 'فيلا', 'مكتب', 'أرض', 'محل تجاري', 'شاليه'];
  const listingTypes = ['', 'للبيع', 'للإيجار'];

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

  return (
    <div className="bg-white rounded-xl shadow-xl p-6 -mt-12 relative z-10 border border-slate-200">
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">كود العقار</label>
        <input
          type="text"
          value={filters.propertyCode}
          onChange={(e) => onFilterChange('propertyCode', e.target.value)}
          placeholder="مثال: Horus001"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">المدينة</label>
          <select
            value={filters.city}
            onChange={(e) => {
              onFilterChange('city', e.target.value);
              // Reset area when city changes
              onFilterChange('area', '');
            }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">جميع المدن</option>
            {cities.map(city => (
              <option key={city.id} value={city.name}>{city.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">المنطقة</label>
          <select
            value={filters.area}
            onChange={(e) => onFilterChange('area', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">نوع العقار</label>
          <select
            value={filters.propertyType}
            onChange={(e) => onFilterChange('propertyType', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">جميع الأنواع</option>
            {propertyTypes.filter(t => t).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">حالة العقار</label>
          <select
            value={filters.listingType}
            onChange={(e) => onFilterChange('listingType', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">الكل</option>
            {listingTypes.filter(t => t).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">عدد الغرف</label>
          <select
            value={filters.bedrooms}
            onChange={(e) => onFilterChange('bedrooms', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">أي عدد</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4+</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">الحد الأدنى للسعر</label>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => onFilterChange('minPrice', e.target.value)}
            placeholder="مثال: 500000"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">الحد الأقصى للسعر</label>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange('maxPrice', e.target.value)}
            placeholder="مثال: 2000000"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">الحد الأدنى للمساحة (م²)</label>
          <input
            type="number"
            value={filters.minArea}
            onChange={(e) => onFilterChange('minArea', e.target.value)}
            placeholder="مثال: 100"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl font-medium text-lg"
        >
          <Search className="w-5 h-5" />
          <span>بحث عن عقار</span>
        </button>
      </div>
    </div>
  );
};
