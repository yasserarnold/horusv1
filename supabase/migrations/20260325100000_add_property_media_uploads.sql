ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;

UPDATE public.properties
SET videos = '[]'::jsonb
WHERE videos IS NULL;

ALTER TABLE public.properties
ALTER COLUMN videos SET DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.videos IS
  'مصفوفة روابط الفيديو (عام)';

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'property-media',
  'property-media',
  true,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view property media" ON storage.objects;
CREATE POLICY "Public can view property media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'property-media');

DROP POLICY IF EXISTS "Admins can upload property media" ON storage.objects;
CREATE POLICY "Admins can upload property media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update property media" ON storage.objects;
CREATE POLICY "Admins can update property media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property-media'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'property-media'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete property media" ON storage.objects;
CREATE POLICY "Admins can delete property media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-media'
    AND public.is_admin()
  );

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
  videos jsonb,
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
    p.videos,
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
  videos jsonb,
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
    p.videos,
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
  videos jsonb,
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
    p.videos,
    p.featured,
    p.created_at,
    p.updated_at
  FROM public.properties AS p
  WHERE LOWER(p.property_code) = LOWER(property_code_input)
  LIMIT 1;
$$;
