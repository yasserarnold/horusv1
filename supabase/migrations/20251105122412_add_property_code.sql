/*
  # إضافة كود العقار (Property Code)

  1. التغييرات
    - إضافة عمود `property_code` إلى جدول `properties`
    - الكود يبدأ بـ "Horus" متبوعاً برقم تسلسلي (مثال: Horus001)
    - يجب أن يكون الكود فريد لكل عقار
    - تحديث العقارات الموجودة بأكواد تسلسلية

  2. الخصائص
    - `property_code` (text, unique, not null)
    - فهرس لتسريع البحث بالكود
*/

-- إضافة عمود property_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'property_code'
  ) THEN
    ALTER TABLE properties ADD COLUMN property_code text;
  END IF;
END $$;

-- تحديث العقارات الموجودة بأكواد تسلسلية
DO $$
DECLARE
  prop RECORD;
  counter INT := 1;
BEGIN
  FOR prop IN 
    SELECT id FROM properties 
    WHERE property_code IS NULL 
    ORDER BY created_at
  LOOP
    UPDATE properties 
    SET property_code = 'Horus' || LPAD(counter::text, 3, '0')
    WHERE id = prop.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- جعل العمود إلزامي وفريد
ALTER TABLE properties 
  ALTER COLUMN property_code SET NOT NULL,
  ADD CONSTRAINT properties_property_code_unique UNIQUE (property_code);

-- إضافة فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_properties_property_code 
  ON properties(property_code);

-- إضافة دالة لتوليد الكود التالي تلقائياً
CREATE OR REPLACE FUNCTION generate_next_property_code()
RETURNS TEXT AS $$
DECLARE
  last_code TEXT;
  last_number INT;
  next_number INT;
BEGIN
  -- الحصول على آخر كود
  SELECT property_code INTO last_code
  FROM properties
  ORDER BY property_code DESC
  LIMIT 1;
  
  -- استخراج الرقم من آخر كود
  IF last_code IS NULL THEN
    next_number := 1;
  ELSE
    last_number := SUBSTRING(last_code FROM 6)::INT;
    next_number := last_number + 1;
  END IF;
  
  -- إرجاع الكود الجديد
  RETURN 'Horus' || LPAD(next_number::text, 3, '0');
END;
$$ LANGUAGE plpgsql;
