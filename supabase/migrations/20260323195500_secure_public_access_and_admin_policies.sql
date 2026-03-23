/*
  # Secure public access and admin-only mutations

  1. Changes
    - Add a dedicated admin_users table and is_admin() helper
    - Restrict direct access to properties rows to admins only
    - Expose public property data through SECURITY DEFINER RPCs
    - Make property code generation sequence-backed and insert-safe
*/

-- Ensure property_code exists for older environments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'property_code'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN property_code text;
  END IF;
END $$;

-- Backfill any missing codes before locking the column down
DO $$
DECLARE
  prop RECORD;
  counter BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(property_code FROM '([0-9]+)$')::BIGINT), 0) + 1
  INTO counter
  FROM public.properties
  WHERE property_code IS NOT NULL
    AND property_code ~ '[0-9]+$';

  FOR prop IN
    SELECT id
    FROM public.properties
    WHERE property_code IS NULL OR BTRIM(property_code) = ''
    ORDER BY created_at, id
  LOOP
    UPDATE public.properties
    SET property_code = 'Horus' || LPAD(counter::text, 3, '0')
    WHERE id = prop.id;

    counter := counter + 1;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'properties_property_code_unique'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_property_code_unique UNIQUE (property_code);
  END IF;
END $$;

ALTER TABLE public.properties
  ALTER COLUMN property_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_property_code
  ON public.properties(property_code);

CREATE SEQUENCE IF NOT EXISTS public.property_code_seq;

DO $$
DECLARE
  max_number BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(property_code FROM '([0-9]+)$')::BIGINT), 0)
  INTO max_number
  FROM public.properties
  WHERE property_code ~ '[0-9]+$';

  IF max_number = 0 THEN
    PERFORM setval('public.property_code_seq', 1, false);
  ELSE
    PERFORM setval('public.property_code_seq', max_number, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number BIGINT;
BEGIN
  next_number := nextval('public.property_code_seq');
  RETURN 'Horus' || LPAD(next_number::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_property_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.property_code IS NULL OR BTRIM(NEW.property_code) = '' THEN
    NEW.property_code := public.generate_property_code();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_property_code_before_insert ON public.properties;
CREATE TRIGGER set_property_code_before_insert
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_property_code();

ALTER TABLE public.properties
  ALTER COLUMN property_code SET DEFAULT public.generate_property_code();

CREATE OR REPLACE FUNCTION public.generate_next_property_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.generate_next_property_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_property_code() TO authenticated;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "السماح بقراءة جميع العقارات للعامة" ON public.properties;
DROP POLICY IF EXISTS "السماح بإضافة العقارات للمديرين" ON public.properties;
DROP POLICY IF EXISTS "السماح بتعديل العقارات للمديرين" ON public.properties;
DROP POLICY IF EXISTS "السماح بحذف العقارات للمديرين" ON public.properties;

CREATE POLICY "السماح بقراءة العقارات الكاملة للمديرين"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "السماح بإضافة العقارات للمديرين"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "السماح بتعديل العقارات للمديرين"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "السماح بحذف العقارات للمديرين"
  ON public.properties
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_public_properties()
RETURNS TABLE (
  id uuid,
  property_code text,
  name text,
  description text,
  property_type text,
  listing_type text,
  price numeric,
  area numeric,
  bedrooms integer,
  bathrooms integer,
  floor integer,
  city text,
  area_name text,
  address text,
  latitude numeric,
  longitude numeric,
  images jsonb,
  featured boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.property_code,
    p.name,
    p.description,
    p.property_type,
    p.listing_type,
    p.price,
    p.area,
    p.bedrooms,
    p.bathrooms,
    p.floor,
    p.city,
    p.area_name,
    p.address,
    p.latitude,
    p.longitude,
    p.images,
    p.featured,
    p.created_at,
    p.updated_at
  FROM public.properties AS p
  ORDER BY p.featured DESC, p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_property(property_id uuid)
RETURNS TABLE (
  id uuid,
  property_code text,
  name text,
  description text,
  property_type text,
  listing_type text,
  price numeric,
  area numeric,
  bedrooms integer,
  bathrooms integer,
  floor integer,
  city text,
  area_name text,
  address text,
  latitude numeric,
  longitude numeric,
  images jsonb,
  featured boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.property_code,
    p.name,
    p.description,
    p.property_type,
    p.listing_type,
    p.price,
    p.area,
    p.bedrooms,
    p.bathrooms,
    p.floor,
    p.city,
    p.area_name,
    p.address,
    p.latitude,
    p.longitude,
    p.images,
    p.featured,
    p.created_at,
    p.updated_at
  FROM public.properties AS p
  WHERE p.id = property_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_properties() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_properties() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_property(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "السماح بإضافة المدن للمديرين" ON public.cities;
DROP POLICY IF EXISTS "السماح بتعديل المدن للمديرين" ON public.cities;
DROP POLICY IF EXISTS "السماح بحذف المدن للمديرين" ON public.cities;

CREATE POLICY "السماح بإضافة المدن للمديرين"
  ON public.cities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "السماح بتعديل المدن للمديرين"
  ON public.cities
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "السماح بحذف المدن للمديرين"
  ON public.cities
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "السماح بإضافة المناطق للمديرين" ON public.areas;
DROP POLICY IF EXISTS "السماح بتعديل المناطق للمديرين" ON public.areas;
DROP POLICY IF EXISTS "السماح بحذف المناطق للمديرين" ON public.areas;

CREATE POLICY "السماح بإضافة المناطق للمديرين"
  ON public.areas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "السماح بتعديل المناطق للمديرين"
  ON public.areas
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "السماح بحذف المناطق للمديرين"
  ON public.areas
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
