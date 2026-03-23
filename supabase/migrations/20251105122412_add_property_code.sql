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
  counter BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(property_code FROM '([0-9]+)$')::BIGINT), 0) + 1
  INTO counter
  FROM properties
  WHERE property_code IS NOT NULL
    AND property_code ~ '[0-9]+$';

  FOR prop IN 
    SELECT id FROM properties 
    WHERE property_code IS NULL OR BTRIM(property_code) = ''
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
CREATE SEQUENCE IF NOT EXISTS public.property_code_seq;

DO $$
DECLARE
  max_number BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(property_code FROM '([0-9]+)$')::BIGINT), 0)
  INTO max_number
  FROM properties
  WHERE property_code ~ '[0-9]+$';

  IF max_number = 0 THEN
    PERFORM setval('public.property_code_seq', 1, false);
  ELSE
    PERFORM setval('public.property_code_seq', max_number, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TEXT AS $$
DECLARE
  next_number BIGINT;
BEGIN
  next_number := nextval('public.property_code_seq');
  RETURN 'Horus' || LPAD(next_number::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.assign_property_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_code IS NULL OR BTRIM(NEW.property_code) = '' THEN
    NEW.property_code := public.generate_property_code();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_property_code_before_insert ON properties;
CREATE TRIGGER set_property_code_before_insert
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_property_code();

ALTER TABLE properties
  ALTER COLUMN property_code SET DEFAULT public.generate_property_code();

CREATE OR REPLACE FUNCTION generate_next_property_code()
RETURNS TEXT AS $$
DECLARE
  current_value BIGINT;
  sequence_called BOOLEAN;
  next_number BIGINT;
BEGIN
  SELECT last_value, is_called
  INTO current_value, sequence_called
  FROM public.property_code_seq;

  IF sequence_called THEN
    next_number := current_value + 1;
  ELSE
    next_number := current_value;
  END IF;

  RETURN 'Horus' || LPAD(next_number::text, 3, '0');
END;
$$ LANGUAGE plpgsql;
