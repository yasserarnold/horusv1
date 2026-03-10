import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '';

const MAX_RESULTS = 5;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const telegramApiUrl = (method) => `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;

const formatNumber = (value) => {
  try {
    return new Intl.NumberFormat('ar-EG').format(value);
  } catch {
    return String(value);
  }
};


const getCommand = (text) => {
  if (!text || !text.startsWith('/')) return '';
  return text.split(/\s+/)[0].split('@')[0];
};

const buildHelp = () => {
  const lines = [
    'مرحباً بك في بوت عقارات حورس 👋',
    '',
    'الأوامر المتاحة:',
    '/latest - أحدث 5 عقارات',
    '/search كلمة - بحث بالاسم أو المدينة أو الكود',
    '/code كود - بحث مباشر بكود العقار',
    '/area اسم - بحث بالمنطقة',
    '/help - المساعدة',
  ];

  return lines.join('\n');
};

const sendTelegram = async (method, payload) => {
  const response = await fetch(telegramApiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
};

const sendMessage = async (chatId, text, extra = {}) => {
  return sendTelegram('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  });
};

const sendPhoto = async (chatId, photo, caption) => {
  return sendTelegram('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
  });
};

const sendTelegramMultipart = async (method, formData) => {
  const response = await fetch(telegramApiUrl(method), {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

const limitCaption = (text, max = 900) => {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
};

const buildPropertyUrl = (property) => {
  if (!PUBLIC_SITE_URL) return '';

  try {
    const url = new URL(PUBLIC_SITE_URL);
    if (property?.id) {
      url.searchParams.set('property', property.id);
    }
    return url.toString();
  } catch {
    if (!property?.id) return PUBLIC_SITE_URL;
    const separator = PUBLIC_SITE_URL.includes('?') ? '&' : '?';
    return `${PUBLIC_SITE_URL}${separator}property=${property.id}`;
  }
};

const buildPropertyText = (property) => {
  const lines = [
    `🏠 ${property.name}`,
    `🧾 الكود: ${property.property_code || '-'}`,
    `📍 ${property.city} - ${property.area_name}`,
    `💰 السعر: ${formatNumber(property.price)} جنيه`,
    `📏 المساحة: ${property.area} م²`,
  ];

  if (property.bedrooms) lines.push(`🛏️ غرف النوم: ${property.bedrooms}`);
  if (property.bathrooms) lines.push(`🚿 الحمامات: ${property.bathrooms}`);
  if (property.property_type) lines.push(`🏷️ النوع: ${property.property_type}`);
  if (property.listing_type) lines.push(`🔖 الحالة: ${property.listing_type}`);
  if (property.featured) lines.push('⭐ عقار مميز');

  const propertyUrl = buildPropertyUrl(property);
  if (propertyUrl) {
    lines.push(`🌐 ${propertyUrl}`);
  }

  return lines.join('\n');
};

const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (trimmed.startsWith('/') && PUBLIC_SITE_URL) {
    return `${PUBLIC_SITE_URL.replace(/\/$/, '')}${trimmed}`;
  }

  if (SUPABASE_URL) {
    const base = SUPABASE_URL.replace(/\/$/, '');
    const path = trimmed.replace(/^\/+/, '');
    return `${base}/storage/v1/object/public/${path}`;
  }

  return trimmed;
};

const coerceImageList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed
        .split(/[\n,|;]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const getImages = (property) => {
  if (!property) return [];
  const list = coerceImageList(property.images);
  return list
    .map(normalizeImageUrl)
    .filter((url) => typeof url === 'string' && url.trim().length > 0);
};

const MAX_UPLOAD_BYTES = 9_500_000;

const guessFileName = (url, contentType) => {
  const extFromType = contentType?.split('/')[1]?.split(';')[0];
  if (extFromType) return `photo.${extFromType}`;
  const fromUrl = url.split('?')[0].split('#')[0].split('/').pop();
  if (fromUrl && fromUrl.includes('.')) return fromUrl;
  return 'photo.jpg';
};

const sendPhotoUpload = async (chatId, photoUrl, caption) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(photoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HorusBot/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return { ok: false };

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return { ok: false };

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > MAX_UPLOAD_BYTES) return { ok: false };

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_UPLOAD_BYTES) return { ok: false };

    const form = new FormData();
    form.append('chat_id', String(chatId));
    if (caption) form.append('caption', caption);
    const filename = guessFileName(photoUrl, contentType);
    form.append('photo', new Blob([buffer], { type: contentType }), filename);

    return sendTelegramMultipart('sendPhoto', form);
  } catch {
    return { ok: false };
  }
};

const sendPhotoSafe = async (chatId, photo, caption, options = {}) => {
  const { fallbackToLink = true } = options;
  let result = await sendPhotoUpload(chatId, photo, caption);
  if (result?.ok) return true;

  result = await sendPhoto(chatId, photo, caption);
  if (result?.ok) return true;

  if (fallbackToLink) {
    const fallback = caption
      ? `${caption}\n\nرابط الصورة:\n${photo}`
      : `رابط الصورة:\n${photo}`;
    await sendMessage(chatId, fallback);
  }
  return false;
};

const sendProperty = async (chatId, property) => {
  const caption = limitCaption(buildPropertyText(property));
  const images = getImages(property).slice(0, 5);

  if (images.length === 0) {
    await sendMessage(chatId, caption);
    return;
  }

  await sendMessage(chatId, caption);

  let failed = 0;
  for (const url of images) {
    const ok = await sendPhotoSafe(chatId, url, undefined, { fallbackToLink: false });
    if (!ok) failed += 1;
  }

  if (failed > 0) {
    await sendMessage(
      chatId,
      `تعذر إرسال ${failed} صورة. تأكد أن الروابط عامة وبحجم أقل من 10MB.`
    );
  }
};

const searchProperties = async (query) => {
  const raw = (query || '').trim();
  if (!raw) return [];

  const clean = raw.replace(/[,]/g, ' ').trim().slice(0, 60);
  const codeCandidate = clean.replace(/\s+/g, '').toUpperCase();

  if (codeCandidate) {
    const { data: exact } = await supabase
      .from('properties')
      .select(
        'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured, images'
      )
      .eq('property_code', codeCandidate)
      .limit(1)
      .maybeSingle();

    if (exact) return [exact];
  }

  const like = `%${clean}%`;
  const { data } = await supabase
    .from('properties')
    .select(
      'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured, images'
    )
    .or(
      `name.ilike.${like},city.ilike.${like},area_name.ilike.${like},address.ilike.${like},property_code.ilike.${like}`
    )
    .limit(MAX_RESULTS);

  return data || [];
};

const handleLatest = async (chatId) => {
  const { data } = await supabase
    .from('properties')
    .select(
      'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured, images, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) {
    await sendMessage(chatId, 'لا توجد عقارات حالياً.');
    return;
  }

  await sendMessage(chatId, '🆕 أحدث 5 عقارات:');

  for (const property of data) {
    await sendProperty(chatId, property);
  }
};

const handleAreaSearch = async (chatId, query) => {
  const raw = (query || '').trim();
  if (!raw) {
    await sendMessage(chatId, 'اكتب اسم المنطقة بعد الأمر /area');
    return;
  }

  const clean = raw.replace(/[,]/g, ' ').trim().slice(0, 60);
  const like = `%${clean}%`;
  const { data } = await supabase
    .from('properties')
    .select(
      'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured, images'
    )
    .ilike('area_name', like)
    .limit(MAX_RESULTS);

  if (!data || data.length === 0) {
    await sendMessage(chatId, 'لم يتم العثور على نتائج مطابقة للمنطقة.');
    return;
  }

  await sendMessage(chatId, `تم العثور على ${data.length} نتيجة:`);
  for (const property of data) {
    await sendProperty(chatId, property);
  }
};

const handleSearchCommand = async (chatId, query) => {
  if (!query) {
    await sendMessage(chatId, 'اكتب كلمة البحث بعد الأمر /search');
    return;
  }

  const results = await searchProperties(query);

  if (!results.length) {
    await sendMessage(chatId, 'لم يتم العثور على نتائج مطابقة.');
    return;
  }

  await sendMessage(chatId, `تم العثور على ${results.length} نتيجة:`);
  for (const property of results) {
    await sendProperty(chatId, property);
  }
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true });
  }

  if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing environment variables.' });
  }

  if (TELEGRAM_WEBHOOK_SECRET) {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  let update = req.body;
  if (typeof update === 'string') {
    try {
      update = JSON.parse(update);
    } catch {
      update = null;
    }
  }

  if (!update) {
    return res.status(400).json({ ok: false, error: 'Invalid update' });
  }

  const message = update.message || update.edited_message;
  if (!message) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat?.id;
  const text = (message.text || '').trim();

  if (!chatId) {
    return res.status(200).json({ ok: true });
  }

  if (!text) {
    await sendMessage(chatId, 'أرسل نصاً للبحث أو استخدم /help.');
    return res.status(200).json({ ok: true });
  }

  const command = getCommand(text);
  const args = text.split(/\s+/).slice(1);

  if (command === '/start' || command === '/help') {
    await sendMessage(chatId, buildHelp());
    return res.status(200).json({ ok: true });
  }

  if (command === '/search') {
    await handleSearchCommand(chatId, args.join(' '));
    return res.status(200).json({ ok: true });
  }

  if (command === '/latest' || command === '/list') {
    await handleLatest(chatId);
    return res.status(200).json({ ok: true });
  }

  if (command === '/code') {
    await handleSearchCommand(chatId, args.join(' '));
    return res.status(200).json({ ok: true });
  }

  if (command === '/area') {
    await handleAreaSearch(chatId, args.join(' '));
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('بحث ')) {
    await handleSearchCommand(chatId, text.replace(/^بحث\s+/, ''));
    return res.status(200).json({ ok: true });
  }

  // رد تلقائي بسيط مع محاولة بحث سريعة
  const results = await searchProperties(text);
  if (results.length) {
    await sendMessage(chatId, `تم العثور على ${results.length} نتيجة:`);
    for (const property of results) {
      await sendProperty(chatId, property);
    }
  } else {
    await sendMessage(chatId, buildHelp());
  }

  return res.status(200).json({ ok: true });
}
