ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS finishing_status text;

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_finishing_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_finishing_status_check
CHECK (
  finishing_status IS NULL
  OR finishing_status IN ('سوبر لوكس', 'نصف تشطيب', 'تحت الإنشاء')
);

COMMENT ON COLUMN public.properties.finishing_status IS
  'حالة التشطيب: سوبر لوكس، نصف تشطيب، تحت الإنشاء (عام)';

CREATE OR REPLACE FUNCTION public.get_public_properties()
RETURNS TABLE (
  id uuid,
  property_code text,
  name text,
  description text,
  property_type text,
  listing_type text,
  finishing_status text,
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
    p.finishing_status,
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
  finishing_status text,
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
    p.finishing_status,
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
