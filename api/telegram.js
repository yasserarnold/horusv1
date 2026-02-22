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
    '/search كلمة - بحث بالاسم أو المدينة أو الكود',
    '/code كود - بحث مباشر بكود العقار',
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

const sendMediaGroup = async (chatId, media) => {
  return sendTelegram('sendMediaGroup', {
    chat_id: chatId,
    media,
  });
};

const limitCaption = (text, max = 900) => {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
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

  if (PUBLIC_SITE_URL) {
    lines.push(`🌐 ${PUBLIC_SITE_URL}`);
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
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
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

const sendProperty = async (chatId, property) => {
  const caption = limitCaption(buildPropertyText(property));
  const images = getImages(property).slice(0, 5);

  if (images.length === 0) {
    await sendMessage(chatId, caption);
    return;
  }

  if (images.length === 1) {
    const result = await sendPhoto(chatId, images[0], caption);
    if (!result?.ok) {
      await sendMessage(chatId, `${caption}\n\nروابط الصور:\n${images[0]}`);
    }
    return;
  }

  const media = images.map((url, index) => ({
    type: 'photo',
    media: url,
    ...(index === 0 ? { caption } : {}),
  }));

  const result = await sendMediaGroup(chatId, media);
  if (!result?.ok) {
    await sendMessage(chatId, `${caption}\n\nروابط الصور:\n${images.join('\n')}`);
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

  if (command === '/code') {
    await handleSearchCommand(chatId, args.join(' '));
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
