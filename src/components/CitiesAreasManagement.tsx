import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save } from 'lucide-react';
import {
  getCities,
  getAreasByCity,
  addCity,
  addArea,
  updateCity,
  updateArea,
  deleteCity,
  deleteArea,
  clearCache,
  City,
  Area
} from '../lib/citiesAreas';

export const CitiesAreasManagement = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالات النماذج
  const [showCityForm, setShowCityForm] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [cityName, setCityName] = useState('');
  const [areaName, setAreaName] = useState('');

  // جلب المدن عند تحميل المكون
  useEffect(() => {
    loadCities();
  }, []);

  // جلب المناطق عند اختيار مدينة
  useEffect(() => {
    if (selectedCity) {
      loadAreas(selectedCity.id);
    } else {
      setAreas([]);
    }
  }, [selectedCity]);

  const loadCities = async () => {
    setLoading(true);
    try {
      const citiesData = await getCities();
      setCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
      alert('حدث خطأ أثناء جلب المدن');
    } finally {
      setLoading(false);
    }
  };

  const loadAreas = async (cityId: string) => {
    try {
      const areasData = await getAreasByCity(cityId);
      setAreas(areasData);
    } catch (error) {
      console.error('Error loading areas:', error);
      alert('حدث خطأ أثناء جلب المناطق');
    }
  };

  const handleAddCity = async () => {
    if (!cityName.trim()) {
      alert('يرجى إدخال اسم المدينة');
      return;
    }

    try {
      const newCity = await addCity(cityName.trim());
      if (newCity) {
        await loadCities();
        setCityName('');
        setShowCityForm(false);
        clearCache();
        alert('تم إضافة المدينة بنجاح');
      }
    } catch (error) {
      console.error('Error adding city:', error);
      alert('حدث خطأ أثناء إضافة المدينة');
    }
  };

  const handleUpdateCity = async () => {
    if (!editingCity || !cityName.trim()) {
      return;
    }

    try {
      const updated = await updateCity(editingCity.id, cityName.trim());
      if (updated) {
        await loadCities();
        setCityName('');
        setEditingCity(null);
        setShowCityForm(false);
        clearCache();
        alert('تم تحديث المدينة بنجاح');
      }
    } catch (error) {
      console.error('Error updating city:', error);
      alert('حدث خطأ أثناء تحديث المدينة');
    }
  };

  const handleDeleteCity = async (city: City) => {
    if (!confirm(`هل أنت متأكد من حذف المدينة "${city.name}"؟ سيتم حذف جميع المناطق التابعة لها أيضاً.`)) {
      return;
    }

    try {
      const success = await deleteCity(city.id);
      if (success) {
        await loadCities();
        if (selectedCity?.id === city.id) {
          setSelectedCity(null);
        }
        clearCache();
        alert('تم حذف المدينة بنجاح');
      }
    } catch (error) {
      console.error('Error deleting city:', error);
      alert('حدث خطأ أثناء حذف المدينة');
    }
  };

  const handleAddArea = async () => {
    if (!selectedCity) {
      alert('يرجى اختيار مدينة أولاً');
      return;
    }

    if (!areaName.trim()) {
      alert('يرجى إدخال اسم المنطقة');
      return;
    }

    try {
      const newArea = await addArea(selectedCity.id, areaName.trim());
      if (newArea) {
        await loadAreas(selectedCity.id);
        setAreaName('');
        setShowAreaForm(false);
        clearCache();
        alert('تم إضافة المنطقة بنجاح');
      }
    } catch (error) {
      console.error('Error adding area:', error);
      alert('حدث خطأ أثناء إضافة المنطقة');
    }
  };

  const handleUpdateArea = async () => {
    if (!editingArea || !areaName.trim()) {
      return;
    }

    try {
      const updated = await updateArea(editingArea.id, areaName.trim());
      if (updated) {
        if (selectedCity) {
          await loadAreas(selectedCity.id);
        }
        setAreaName('');
        setEditingArea(null);
        setShowAreaForm(false);
        clearCache();
        alert('تم تحديث المنطقة بنجاح');
      }
    } catch (error) {
      console.error('Error updating area:', error);
      alert('حدث خطأ أثناء تحديث المنطقة');
    }
  };

  const handleDeleteArea = async (area: Area) => {
    if (!confirm(`هل أنت متأكد من حذف المنطقة "${area.name}"؟`)) {
      return;
    }

    try {
      const success = await deleteArea(area.id);
      if (success) {
        if (selectedCity) {
          await loadAreas(selectedCity.id);
        }
        clearCache();
        alert('تم حذف المنطقة بنجاح');
      }
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('حدث خطأ أثناء حذف المنطقة');
    }
  };

  const openCityForm = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setCityName(city.name);
    } else {
      setEditingCity(null);
      setCityName('');
    }
    setShowCityForm(true);
  };

  const openAreaForm = (area?: Area) => {
    if (area) {
      setEditingArea(area);
      setAreaName(area.name);
    } else {
      setEditingArea(null);
      setAreaName('');
    }
    setShowAreaForm(true);
  };

  const closeCityForm = () => {
    setShowCityForm(false);
    setEditingCity(null);
    setCityName('');
  };

  const closeAreaForm = () => {
    setShowAreaForm(false);
    setEditingArea(null);
    setAreaName('');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-600 mx-auto mb-4"></div>
        <p className="text-slate-600">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">إدارة المدن والمناطق</h2>
          <button
            onClick={() => openCityForm()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مدينة</span>
          </button>
        </div>

        {/* قائمة المدن */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.map(city => (
            <div
              key={city.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedCity?.id === city.id
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
              onClick={() => setSelectedCity(city)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{city.name}</h3>
                  <p className="text-sm text-slate-600">
                    {areas.length} منطقة
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCityForm(city);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCity(city);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* قائمة المناطق */}
      {selectedCity && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">مناطق {selectedCity.name}</h2>
              <p className="text-slate-600 mt-1">{areas.length} منطقة</p>
            </div>
            <button
              onClick={() => openAreaForm()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة منطقة</span>
            </button>
          </div>

          {areas.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <p className="text-slate-600">لا توجد مناطق لهذه المدينة</p>
              <button
                onClick={() => openAreaForm()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                إضافة أول منطقة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.map(area => (
                <div
                  key={area.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-slate-900">{area.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAreaForm(area)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteArea(area)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* نموذج إضافة/تعديل مدينة */}
      {showCityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingCity ? 'تعديل المدينة' : 'إضافة مدينة جديدة'}
              </h3>
              <button
                onClick={closeCityForm}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">اسم المدينة *</label>
              <input
                type="text"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="مثال: القاهرة"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingCity ? handleUpdateCity : handleAddCity}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all"
              >
                <Save className="w-5 h-5" />
                <span>{editingCity ? 'حفظ التعديلات' : 'إضافة'}</span>
              </button>
              <button
                onClick={closeCityForm}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل منطقة */}
      {showAreaForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingArea ? 'تعديل المنطقة' : 'إضافة منطقة جديدة'}
              </h3>
              <button
                onClick={closeAreaForm}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedCity && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">المدينة:</span> {selectedCity.name}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">اسم المنطقة *</label>
              <input
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="مثال: فيصل"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingArea ? handleUpdateArea : handleAddArea}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <Save className="w-5 h-5" />
                <span>{editingArea ? 'حفظ التعديلات' : 'إضافة'}</span>
              </button>
              <button
                onClick={closeAreaForm}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

