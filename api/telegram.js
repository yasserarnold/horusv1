import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

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

const isAdmin = (userId) => TELEGRAM_ADMIN_IDS.includes(String(userId));

const getCommand = (text) => {
  if (!text || !text.startsWith('/')) return '';
  return text.split(/\s+/)[0].split('@')[0];
};

const buildHelp = (admin) => {
  const lines = [
    'مرحباً بك في بوت عقارات حورس 👋',
    '',
    'الأوامر المتاحة:',
    '/search كلمة - بحث بالاسم أو المدينة أو الكود',
    '/code كود - بحث مباشر بكود العقار',
    '/id - عرض رقم المستخدم (لاستخدامه في الإدارة)',
    '/help - المساعدة',
  ];

  if (admin) {
    lines.push('');
    lines.push('أوامر الإدارة:');
    lines.push('/admin - قائمة الإدارة');
    lines.push('/stats - إحصائيات العقارات');
    lines.push('/latest - أحدث 5 عقارات');
    lines.push('/feature كود on|off - تمييز/إلغاء تمييز عقار');
    lines.push('/price كود رقم - تحديث السعر');
  }

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

const searchProperties = async (query) => {
  const raw = (query || '').trim();
  if (!raw) return [];

  const clean = raw.replace(/[,]/g, ' ').trim().slice(0, 60);
  const codeCandidate = clean.replace(/\s+/g, '').toUpperCase();

  if (codeCandidate) {
    const { data: exact } = await supabase
      .from('properties')
      .select(
        'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured'
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
      'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured'
    )
    .or(
      `name.ilike.${like},city.ilike.${like},area_name.ilike.${like},address.ilike.${like},property_code.ilike.${like}`
    )
    .limit(MAX_RESULTS);

  return data || [];
};

const handleStats = async (chatId) => {
  const { count: totalCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true });

  const { count: featuredCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('featured', true);

  const lines = [
    '📊 الإحصائيات',
    `إجمالي العقارات: ${totalCount || 0}`,
    `العقارات المميزة: ${featuredCount || 0}`,
  ];

  await sendMessage(chatId, lines.join('\n'));
};

const handleLatest = async (chatId) => {
  const { data } = await supabase
    .from('properties')
    .select(
      'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) {
    await sendMessage(chatId, 'لا توجد عقارات حالياً.');
    return;
  }

  await sendMessage(chatId, '🆕 أحدث العقارات:');

  for (const property of data) {
    await sendMessage(chatId, buildPropertyText(property));
  }
};

const handleFeature = async (chatId, args) => {
  const [code, state] = args;
  if (!code || !state) {
    await sendMessage(chatId, 'الاستخدام: /feature كود on|off');
    return;
  }

  const enabled = state.toLowerCase() === 'on';

  const { data, error } = await supabase
    .from('properties')
    .update({ featured: enabled })
    .eq('property_code', code)
    .select('name, property_code, featured')
    .maybeSingle();

  if (error || !data) {
    await sendMessage(chatId, 'لم يتم العثور على العقار بالكود المحدد.');
    return;
  }

  await sendMessage(
    chatId,
    `تم تحديث التمييز: ${data.name} (${data.property_code}) -> ${data.featured ? 'مميز' : 'غير مميز'}`
  );
};

const handlePrice = async (chatId, args) => {
  const [code, priceText] = args;
  const price = Number(priceText);

  if (!code || !priceText || Number.isNaN(price) || price <= 0) {
    await sendMessage(chatId, 'الاستخدام: /price كود رقم');
    return;
  }

  const { data, error } = await supabase
    .from('properties')
    .update({ price })
    .eq('property_code', code)
    .select('name, property_code, price')
    .maybeSingle();

  if (error || !data) {
    await sendMessage(chatId, 'لم يتم العثور على العقار بالكود المحدد.');
    return;
  }

  await sendMessage(
    chatId,
    `تم تحديث السعر: ${data.name} (${data.property_code}) -> ${formatNumber(data.price)} جنيه`
  );
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
    await sendMessage(chatId, buildPropertyText(property));
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
  const userId = message.from?.id;
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
    await sendMessage(chatId, buildHelp(isAdmin(userId)));
    return res.status(200).json({ ok: true });
  }

  if (command === '/admin') {
    if (!isAdmin(userId)) {
      await sendMessage(chatId, 'هذا الأمر متاح للإدارة فقط.');
      return res.status(200).json({ ok: true });
    }
    await sendMessage(chatId, buildHelp(true));
    return res.status(200).json({ ok: true });
  }

  if (command === '/search') {
    await handleSearchCommand(chatId, args.join(' '));
    return res.status(200).json({ ok: true });
  }

  if (command === '/id') {
    await sendMessage(chatId, `رقم المستخدم الخاص بك: ${userId}`);
    return res.status(200).json({ ok: true });
  }

  if (command === '/code') {
    await handleSearchCommand(chatId, args.join(' '));
    return res.status(200).json({ ok: true });
  }

  if (command === '/stats') {
    if (!isAdmin(userId)) {
      await sendMessage(chatId, 'هذا الأمر متاح للإدارة فقط.');
      return res.status(200).json({ ok: true });
    }
    await handleStats(chatId);
    return res.status(200).json({ ok: true });
  }

  if (command === '/latest') {
    if (!isAdmin(userId)) {
      await sendMessage(chatId, 'هذا الأمر متاح للإدارة فقط.');
      return res.status(200).json({ ok: true });
    }
    await handleLatest(chatId);
    return res.status(200).json({ ok: true });
  }

  if (command === '/feature') {
    if (!isAdmin(userId)) {
      await sendMessage(chatId, 'هذا الأمر متاح للإدارة فقط.');
      return res.status(200).json({ ok: true });
    }
    await handleFeature(chatId, args);
    return res.status(200).json({ ok: true });
  }

  if (command === '/price') {
    if (!isAdmin(userId)) {
      await sendMessage(chatId, 'هذا الأمر متاح للإدارة فقط.');
      return res.status(200).json({ ok: true });
    }
    await handlePrice(chatId, args);
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
      await sendMessage(chatId, buildPropertyText(property));
    }
  } else {
    await sendMessage(chatId, buildHelp(isAdmin(userId)));
  }

  return res.status(200).json({ ok: true });
}
