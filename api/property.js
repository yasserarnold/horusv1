import { createClient } from '@supabase/supabase-js';

// إنشاء Supabase Client (Server-side فقط)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // السماح فقط بـ GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  // قراءة كود العقار
  const { code } = req.query;

  // التحقق من وجود الكود
  if (!code) {
    return res.status(400).json({
      error: 'Property code is required'
    });
  }

  try {
      // جلب العقار بالكود
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        code:property_code,
        location:city,
        project:name,
        area,
        rooms:bedrooms,
        price,
        feature:featured
        `
      )
      .eq('property_code', code)
      .single();

    // في حالة عدم وجود العقار
    if (error || !data) {
      return res.status(404).json({
        error: 'Property not found'
      });
    }

    // إرجاع البيانات
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
