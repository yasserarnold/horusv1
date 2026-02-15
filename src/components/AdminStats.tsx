import { useEffect, useState } from 'react';
import { BarChart3, Home, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AdminStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    forSale: 0,
    forRent: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('listing_type, price');

      if (error) throw error;

      const total = data?.length || 0;
      const forSale = data?.filter(p => p.listing_type === 'للبيع').length || 0;
      const forRent = data?.filter(p => p.listing_type === 'للإيجار').length || 0;
      const totalValue = data?.reduce((sum, p) => sum + Number(p.price), 0) || 0;

      setStats({ total, forSale, forRent, totalValue });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">جاري التحميل...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <Home className="w-8 h-8" />
          </div>
          <BarChart3 className="w-6 h-6 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">إجمالي العقارات</h3>
        <p className="text-3xl font-bold">{stats.total}</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <TrendingUp className="w-8 h-8" />
          </div>
          <BarChart3 className="w-6 h-6 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">عقارات للبيع</h3>
        <p className="text-3xl font-bold">{stats.forSale}</p>
      </div>

      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <Home className="w-8 h-8" />
          </div>
          <BarChart3 className="w-6 h-6 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">عقارات للإيجار</h3>
        <p className="text-3xl font-bold">{stats.forRent}</p>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <DollarSign className="w-8 h-8" />
          </div>
          <BarChart3 className="w-6 h-6 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">إجمالي القيمة</h3>
        <p className="text-2xl font-bold">{stats.totalValue.toLocaleString('ar-EG')} جنيه</p>
      </div>
    </div>
  );
};
