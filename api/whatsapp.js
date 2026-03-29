import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const WHATSAPP_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN ||
  process.env.WHATSAPP_TOKEN ||
  '';
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID ||
  process.env.WHATSAPP_NUMBER_ID ||
  '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';

const vercelDeploymentUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  '';
const PUBLIC_SITE_URL =
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (vercelDeploymentUrl ? `https://${vercelDeploymentUrl}` : '');
const KNOWLEDGE_BASE_URL =
  process.env.WHATSAPP_KB_URL ||
  process.env.KNOWLEDGE_BASE_URL ||
  '';
const KNOWLEDGE_BASE_TEXT =
  process.env.WHATSAPP_KB_TEXT ||
  process.env.KNOWLEDGE_BASE_TEXT ||
  '';

const MAX_RESULTS = 5;
const KNOWLEDGE_BASE_CACHE_TTL_MS = 5 * 60 * 1000;
const KNOWLEDGE_BASE_TIMEOUT_MS = 6_000;
const KNOWLEDGE_BASE_MAX_BYTES = 200_000;
const WHATSAPP_TEXT_LIMIT = 3500;

const PUBLIC_PROPERTY_SELECT =
  'id, property_code, name, city, area_name, price, area, bedrooms, bathrooms, listing_type, property_type, featured, images, created_at, address, finishing_status, handover_status';

let supabaseClient = null;
let knowledgeBaseCache = null;
let knowledgeBaseCacheAt = 0;

const getSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) {
    throw new Error('Missing Supabase server credentials.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVER_KEY);
  }

  return supabaseClient;
};

const getMissingEnv = () => {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVER_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY_OR_SUPABASE_ANON_KEY');
  if (!WHATSAPP_ACCESS_TOKEN) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  return missing;
};

const whatsappApiUrl = () =>
  `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

const formatNumber = (value) => {
  try {
    return new Intl.NumberFormat('ar-EG').format(value);
  } catch {
    return String(value);
  }
};

const normalizeText = (value) => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[^\w\u0600-\u06FF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenize = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
};

const uniqueTokens = (tokens) => Array.from(new Set(tokens));

const toStringSafe = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const coerceStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(toStringSafe).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,|;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const coerceKnowledgeEntry = (item) => {
  if (!item) return null;
  if (typeof item === 'string') {
    return {
      question: '',
      answer: item.trim(),
      keywords: [],
    };
  }
  if (typeof item !== 'object') return null;

  const question = toStringSafe(
    item.question ||
      item.q ||
      item.title ||
      item.prompt ||
      item.name ||
      item.heading ||
      item.ask
  );
  const answer = toStringSafe(
    item.answer ||
      item.a ||
      item.response ||
      item.content ||
      item.text ||
      item.body ||
      item.value ||
      item.details
  );
  const keywords = coerceStringArray(
    item.keywords ||
      item.tags ||
      item.synonyms ||
      item.topics ||
      item.keywords_ar
  );

  if (!question && !answer && keywords.length === 0) return null;

  return {
    question,
    answer: answer || question,
    keywords,
  };
};

const extractKnowledgeEntries = (payload) => {
  if (!payload) {
    return { entries: [], fallbackText: '' };
  }

  if (typeof payload === 'string') {
    return { entries: [], fallbackText: payload };
  }

  if (Array.isArray(payload)) {
    return {
      entries: payload.map(coerceKnowledgeEntry).filter(Boolean),
      fallbackText: '',
    };
  }

  if (typeof payload === 'object') {
    const containers = [
      payload.entries,
      payload.items,
      payload.faq,
      payload.faqs,
      payload.questions,
      payload.data,
      payload.records,
      payload.kb,
      payload.knowledge,
      payload.list,
      payload.results,
    ];
    const container = containers.find(Array.isArray);
    if (container) {
      return {
        entries: container.map(coerceKnowledgeEntry).filter(Boolean),
        fallbackText: toStringSafe(payload.text || payload.fallback || payload.default || ''),
      };
    }

    const entry = coerceKnowledgeEntry(payload);
    if (entry) {
      return { entries: [entry], fallbackText: '' };
    }

    return {
      entries: [],
      fallbackText: toStringSafe(payload.text || payload.fallback || payload.default || payload.message || ''),
    };
  }

  return { entries: [], fallbackText: '' };
};

const parseKnowledgeBaseString = (content) => {
  const trimmed = toStringSafe(content);
  if (!trimmed) return { entries: [], fallbackText: '' };

  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed);
      return extractKnowledgeEntries(parsed);
    } catch {
      return { entries: [], fallbackText: trimmed };
    }
  }

  return { entries: [], fallbackText: trimmed };
};

const mergeKnowledgeBase = (base, extra) => ({
  entries: [...(base?.entries || []), ...(extra?.entries || [])],
  fallbackText: base?.fallbackText || extra?.fallbackText || '',
});

const fetchKnowledgeBaseUrl = async (url) => {
  if (!url) return { entries: [], fallbackText: '' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KNOWLEDGE_BASE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HorusWhatsAppBot/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return { entries: [], fallbackText: '' };

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > KNOWLEDGE_BASE_MAX_BYTES) {
      return { entries: [], fallbackText: '' };
    }

    const text = await response.text();
    if (text.length > KNOWLEDGE_BASE_MAX_BYTES) {
      return { entries: [], fallbackText: '' };
    }

    return parseKnowledgeBaseString(text);
  } catch {
    clearTimeout(timeout);
    return { entries: [], fallbackText: '' };
  }
};

const loadKnowledgeBase = async () => {
  if (!KNOWLEDGE_BASE_URL && !KNOWLEDGE_BASE_TEXT) return null;

  const now = Date.now();
  if (
    knowledgeBaseCache &&
    now - knowledgeBaseCacheAt < KNOWLEDGE_BASE_CACHE_TTL_MS
  ) {
    return knowledgeBaseCache;
  }

  let combined = { entries: [], fallbackText: '' };

  if (KNOWLEDGE_BASE_TEXT) {
    combined = mergeKnowledgeBase(combined, parseKnowledgeBaseString(KNOWLEDGE_BASE_TEXT));
  }

  if (KNOWLEDGE_BASE_URL) {
    const fromUrl = await fetchKnowledgeBaseUrl(KNOWLEDGE_BASE_URL);
    combined = mergeKnowledgeBase(combined, fromUrl);
  }

  combined.entries = (combined.entries || []).filter(
    (entry) => entry && (entry.answer || entry.question || entry.keywords?.length)
  );

  knowledgeBaseCache = combined;
  knowledgeBaseCacheAt = now;
  return combined;
};

const findKnowledgeAnswer = (query, knowledgeBase) => {
  if (!knowledgeBase) return '';

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return '';

  const queryTokens = tokenize(normalizedQuery);
  let bestEntry = null;
  let bestScore = 0;

  for (const entry of knowledgeBase.entries || []) {
    const question = entry.question || '';
    const answer = entry.answer || '';
    const keywords = entry.keywords || [];

    const normalizedQuestion = normalizeText(question);
    const normalizedAnswer = normalizeText(answer);

    if (
      normalizedQuestion &&
      (normalizedQuestion.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedQuestion))
    ) {
      return answer || question;
    }

    if (
      normalizedAnswer &&
      (normalizedAnswer.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedAnswer))
    ) {
      return answer;
    }

    const entryTokens = uniqueTokens([
      ...tokenize(question),
      ...keywords.flatMap((keyword) => tokenize(keyword)),
    ]);

    if (!entryTokens.length) continue;

    let score = 0;
    for (const token of queryTokens) {
      if (entryTokens.includes(token)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  const minScore = queryTokens.length >= 3 ? 2 : 1;
  if (bestEntry && bestScore >= minScore) {
    return bestEntry.answer || bestEntry.question;
  }

  return knowledgeBase.fallbackText || '';
};

const buildPropertyUrl = (property) => {
  if (!PUBLIC_SITE_URL) return '';

  try {
    const url = new URL(PUBLIC_SITE_URL);
    const propertyIdentifier = property?.property_code || property?.id;
    if (propertyIdentifier) {
      const basePath = url.pathname.replace(/\/$/, '');
      url.pathname = `${basePath}/property/${encodeURIComponent(propertyIdentifier)}`;
      url.search = '';
      url.hash = '';
    }
    return url.toString();
  } catch {
    const propertyIdentifier = property?.property_code || property?.id;
    if (!propertyIdentifier) return PUBLIC_SITE_URL;
    return `${PUBLIC_SITE_URL.replace(/\/$/, '')}/property/${encodeURIComponent(propertyIdentifier)}`;
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

const buildHelp = () => {
  const lines = [
    'مرحباً بك في الرد التلقائي لعقارات حورس 👋',
    '',
    'يمكنك إرسال:',
    '/latest أو "أحدث" لعرض أحدث العقارات',
    '/search كلمة للبحث بالاسم أو المدينة أو الكود',
    '/code كود للبحث المباشر بالكود',
    '/area اسم_المنطقة للبحث بالمنطقة',
    '/help للمساعدة',
    '',
    'ويمكنك أيضاً كتابة اسم مدينة أو منطقة أو كود عقار مباشرة.',
  ];

  return lines.join('\n');
};

const limitMessage = (text, max = WHATSAPP_TEXT_LIMIT) => {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
};

const sendWhatsApp = async (payload) => {
  const response = await fetch(whatsappApiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
};

const sendTextMessage = async (to, text) => {
  return sendWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: true,
      body: limitMessage(text),
    },
  });
};

const fetchPublicProperties = async () => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc('get_public_properties');
  if (!error && Array.isArray(data)) {
    return data;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('properties')
    .select(PUBLIC_PROPERTY_SELECT)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (fallbackError) {
    console.error('WhatsApp bot failed to fetch properties:', error || fallbackError);
    return [];
  }

  return fallbackData || [];
};

const searchProperties = async (query) => {
  const raw = (query || '').trim();
  if (!raw) return [];

  const clean = raw.replace(/[,]/g, ' ').trim().slice(0, 60);
  const codeCandidate = clean.replace(/\s+/g, '').toUpperCase();
  const normalizedQuery = normalizeText(clean);
  const properties = await fetchPublicProperties();

  const exact = properties.find(
    (property) =>
      String(property.property_code || '').trim().toUpperCase() === codeCandidate,
  );
  if (exact) {
    return [exact];
  }

  return properties
    .filter((property) => {
      const haystack = normalizeText(
        [
          property.name,
          property.city,
          property.area_name,
          property.address,
          property.property_code,
        ]
          .filter(Boolean)
          .join(' '),
      );

      return haystack.includes(normalizedQuery);
    })
    .slice(0, MAX_RESULTS);
};

const sendProperty = async (to, property) => {
  await sendTextMessage(to, buildPropertyText(property));
};

const handleLatest = async (to) => {
  const data = (await fetchPublicProperties())
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    )
    .slice(0, 5);

  if (!data || data.length === 0) {
    await sendTextMessage(to, 'لا توجد عقارات حالياً.');
    return;
  }

  await sendTextMessage(to, '🆕 أحدث 5 عقارات:');

  for (const property of data) {
    await sendProperty(to, property);
  }
};

const handleAreaSearch = async (to, query) => {
  const raw = (query || '').trim();
  if (!raw) {
    await sendTextMessage(to, 'اكتب اسم المنطقة بعد الأمر /area');
    return;
  }

  const clean = raw.replace(/[,]/g, ' ').trim().slice(0, 60);
  const normalizedQuery = normalizeText(clean);
  const data = (await fetchPublicProperties())
    .filter((property) =>
      normalizeText(property.area_name).includes(normalizedQuery),
    )
    .slice(0, MAX_RESULTS);

  if (!data || data.length === 0) {
    await sendTextMessage(to, 'لم يتم العثور على نتائج مطابقة للمنطقة.');
    return;
  }

  await sendTextMessage(to, `تم العثور على ${data.length} نتيجة:`);
  for (const property of data) {
    await sendProperty(to, property);
  }
};

const handleSearchCommand = async (to, query) => {
  if (!query) {
    await sendTextMessage(to, 'اكتب كلمة البحث بعد الأمر /search');
    return;
  }

  const results = await searchProperties(query);

  if (!results.length) {
    await sendTextMessage(to, 'لم يتم العثور على نتائج مطابقة.');
    return;
  }

  await sendTextMessage(to, `تم العثور على ${results.length} نتيجة:`);
  for (const property of results) {
    await sendProperty(to, property);
  }
};

const extractIncomingText = (message) => {
  if (!message || typeof message !== 'object') return '';

  if (message.text?.body) {
    return String(message.text.body).trim();
  }

  if (message.button?.text) {
    return String(message.button.text).trim();
  }

  if (message.interactive?.button_reply?.title) {
    return String(message.interactive.button_reply.title).trim();
  }

  if (message.interactive?.list_reply?.title) {
    return String(message.interactive.list_reply.title).trim();
  }

  return '';
};

const extractIncomingMessages = (payload) => {
  if (!payload || payload.object !== 'whatsapp_business_account') {
    return [];
  }

  return (payload.entry || []).flatMap((entry) =>
    (entry.changes || []).flatMap((change) =>
      (change.value?.messages || []).map((message) => ({
        from: message.from,
        text: extractIncomingText(message),
      })),
    ),
  );
};

const isHelpText = (text) => {
  const normalized = normalizeText(text);
  return ['help', 'start', 'مساعدة', 'ابدأ', 'ابدا'].includes(normalized);
};

const isLatestText = (text) => {
  const normalized = normalizeText(text);
  return ['latest', 'list', 'احدث', 'أحدث', 'اخر', 'آخر', 'جديد'].includes(normalized);
};

const handleIncomingText = async (to, text) => {
  if (!text) {
    await sendTextMessage(to, 'أرسل نصاً للبحث أو اكتب /help.');
    return;
  }

  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  const command = parts[0].startsWith('/') ? parts[0].toLowerCase() : '';
  const args = parts.slice(1).join(' ');

  if (command === '/start' || command === '/help' || isHelpText(trimmed)) {
    await sendTextMessage(to, buildHelp());
    return;
  }

  if (command === '/search') {
    await handleSearchCommand(to, args);
    return;
  }

  if (command === '/latest' || command === '/list' || isLatestText(trimmed)) {
    await handleLatest(to);
    return;
  }

  if (command === '/code') {
    await handleSearchCommand(to, args);
    return;
  }

  if (command === '/area') {
    await handleAreaSearch(to, args);
    return;
  }

  if (trimmed.startsWith('بحث ')) {
    await handleSearchCommand(to, trimmed.replace(/^بحث\s+/, ''));
    return;
  }

  if (trimmed.startsWith('منطقة ')) {
    await handleAreaSearch(to, trimmed.replace(/^منطقة\s+/, ''));
    return;
  }

  const results = await searchProperties(trimmed);
  if (results.length) {
    await sendTextMessage(to, `تم العثور على ${results.length} نتيجة:`);
    for (const property of results) {
      await sendProperty(to, property);
    }
    return;
  }

  const knowledgeBase = await loadKnowledgeBase();
  const knowledgeAnswer = findKnowledgeAnswer(trimmed, knowledgeBase);
  if (knowledgeAnswer) {
    await sendTextMessage(to, knowledgeAnswer);
    return;
  }

  await sendTextMessage(to, buildHelp());
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode || token || challenge) {
      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }

      return res.status(403).json({ ok: false, error: 'Verification failed' });
    }

    return res.status(200).json({
      ok: getMissingEnv().length === 0,
      route: '/api/whatsapp',
      missingEnv: getMissingEnv(),
      webhookVerifyTokenConfigured: Boolean(WHATSAPP_VERIFY_TOKEN),
      publicSiteUrlConfigured: Boolean(PUBLIC_SITE_URL),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missingEnv = getMissingEnv();
  if (missingEnv.length > 0) {
    return res.status(500).json({
      ok: false,
      error: 'Missing environment variables.',
      missingEnv,
    });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  const messages = extractIncomingMessages(payload);
  if (!messages.length) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  for (const message of messages) {
    if (!message.from) continue;
    await handleIncomingText(message.from, message.text || '');
  }

  return res.status(200).json({ ok: true, processed: messages.length });
}
