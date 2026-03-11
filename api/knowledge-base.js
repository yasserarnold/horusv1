import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '';
const WEBHOOK_URL =
  process.env.KNOWLEDGE_BASE_WEBHOOK_URL ||
  process.env.KB_WEBHOOK_URL ||
  '';
const WEBHOOK_HEADERS_RAW =
  process.env.KNOWLEDGE_BASE_WEBHOOK_HEADERS ||
  process.env.KB_WEBHOOK_HEADERS ||
  '';

const PAGE_SIZE = 500;
const WEBHOOK_TIMEOUT_MS = 6_000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const formatNumber = (value) => {
  try {
    return new Intl.NumberFormat('ar-EG').format(value);
  } catch {
    return String(value);
  }
};

const buildPropertyUrl = (propertyId) => {
  if (!PUBLIC_SITE_URL || !propertyId) return '';
  try {
    const url = new URL(PUBLIC_SITE_URL);
    url.searchParams.set('property', propertyId);
    return url.toString();
  } catch {
    const separator = PUBLIC_SITE_URL.includes('?') ? '&' : '?';
    return `${PUBLIC_SITE_URL}${separator}property=${propertyId}`;
  }
};

const normalizeImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed
        .split(/[\n,|;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const buildPropertyEntry = (property) => {
  const url = buildPropertyUrl(property.id);
  const lines = [
    `🏠 ${property.name || ''}`,
    `🧾 الكود: ${property.property_code || '-'}`,
    `📍 الموقع: ${property.city || ''} - ${property.area_name || ''}`,
    `💰 السعر: ${formatNumber(property.price)} جنيه`,
    `📏 المساحة: ${property.area || 0} م²`,
  ];

  if (property.bedrooms) lines.push(`🛏️ غرف النوم: ${property.bedrooms}`);
  if (property.bathrooms) lines.push(`🚿 الحمامات: ${property.bathrooms}`);
  if (property.property_type) lines.push(`🏷️ النوع: ${property.property_type}`);
  if (property.listing_type) lines.push(`🔖 الحالة: ${property.listing_type}`);
  if (property.address) lines.push(`📌 العنوان: ${property.address}`);
  if (property.description) lines.push(`📝 الوصف: ${property.description}`);
  if (url) lines.push(`🌐 ${url}`);

  const questionParts = [];
  if (property.name) questionParts.push(property.name);
  if (property.property_code) questionParts.push(property.property_code);
  const question = questionParts.length
    ? `تفاصيل عقار ${questionParts.join(' - ')}`
    : 'تفاصيل العقار';

  const keywords = [
    property.name,
    property.property_code,
    property.city,
    property.area_name,
    property.property_type,
    property.listing_type,
  ]
    .map((item) => (item ? String(item).trim() : ''))
    .filter(Boolean);

  return {
    question,
    answer: lines.join('\n'),
    keywords,
    property: {
      id: property.id,
      property_code: property.property_code || '',
      name: property.name || '',
      description: property.description || '',
      property_type: property.property_type || '',
      listing_type: property.listing_type || '',
      price: property.price || 0,
      area: property.area || 0,
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      city: property.city || '',
      area_name: property.area_name || '',
      address: property.address || '',
      featured: Boolean(property.featured),
      images: normalizeImages(property.images),
      url,
    },
  };
};

const fetchAllProperties = async () => {
  const all = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('properties')
      .select(
        'id, property_code, name, description, property_type, listing_type, price, area, bedrooms, bathrooms, city, area_name, address, images, featured, created_at'
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
};

const parseWebhookHeaders = () => {
  if (!WEBHOOK_HEADERS_RAW) return {};
  try {
    const parsed = JSON.parse(WEBHOOK_HEADERS_RAW);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return {};
  }
  return {};
};

const sendWebhook = async (payload) => {
  if (!WEBHOOK_URL) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...parseWebhookHeaders(),
    };
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    console.error('Webhook error:', error);
  } finally {
    clearTimeout(timeout);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const properties = await fetchAllProperties();
    const entries = properties.map(buildPropertyEntry);
    const payload = {
      generated_at: new Date().toISOString(),
      count: entries.length,
      entries,
    };

    // إرسال البيانات المجمّعة إلى Webhook إذا تم ضبطه
    if (WEBHOOK_URL && req.query.webhook !== '0') {
      await sendWebhook(payload);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Knowledge base error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
