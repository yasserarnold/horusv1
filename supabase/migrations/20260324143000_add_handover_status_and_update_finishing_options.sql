ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS handover_status text;

UPDATE public.properties
SET handover_status = 'تحت الانشاء'
WHERE handover_status IS NULL
  AND finishing_status IN ('تحت الإنشاء', 'تحت الانشاء');

UPDATE public.properties
SET finishing_status = 'طوب احمر'
WHERE finishing_status IN ('تحت الإنشاء', 'تحت الانشاء');

UPDATE public.properties
SET handover_status = 'استلام فوري'
WHERE handover_status IS NULL
  AND finishing_status IN ('سوبر لوكس', 'نصف تشطيب', 'طوب احمر');

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_finishing_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_finishing_status_check
CHECK (
  finishing_status IS NULL
  OR finishing_status IN ('سوبر لوكس', 'نصف تشطيب', 'طوب احمر')
);

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_handover_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_handover_status_check
CHECK (
  handover_status IS NULL
  OR handover_status IN ('استلام فوري', 'تحت الانشاء')
);

COMMENT ON COLUMN public.properties.finishing_status IS
  'حالة التشطيب: سوبر لوكس، نصف تشطيب، طوب احمر (عام)';

COMMENT ON COLUMN public.properties.handover_status IS
  'حالة الاستلام: استلام فوري، تحت الانشاء (عام)';

CREATE OR REPLACE FUNCTION public.get_public_properties()
RETURNS TABLE (
  id uuid,
  property_code text,
  name text,
  description text,
  property_type text,
  listing_type text,
  finishing_status text,
  handover_status text,
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
    p.handover_status,
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
  handover_status text,
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
    p.handover_status,
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

CREATE OR REPLACE FUNCTION public.get_public_property_by_code(property_code_input text)
RETURNS TABLE (
  id uuid,
  property_code text,
  name text,
  description text,
  property_type text,
  listing_type text,
  finishing_status text,
  handover_status text,
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
    p.handover_status,
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
  WHERE LOWER(p.property_code) = LOWER(property_code_input)
  LIMIT 1;
$$;
