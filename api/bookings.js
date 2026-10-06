const ALLOWED_ORIGINS = new Set([
  'https://k-peach-eight.vercel.app',
]);

function getOrigin(req) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  return ALLOWED_ORIGINS.values().next().value;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizePhone(phone) {
  const raw = clean(phone, 30).replace(/[\s()-]/g, '');
  if (/^01[0-25]\d{8}$/.test(raw)) return raw;
  if (/^\+201[0-25]\d{8}$/.test(raw)) return '0' + raw.slice(3);
  if (/^00201[0-25]\d{8}$/.test(raw)) return '0' + raw.slice(5);
  return null;
}

function validDate(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : value;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return String(forwarded || '').split(',')[0].trim().slice(0, 64);
}

export default async function handler(req, res) {
  const origin = getOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, message: 'Method Not Allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return sendJson(res, 500, { ok: false, message: 'خدمة الحجز غير مهيأة على الخادم.' });
  }

  const body = req.body && typeof req.body === 'object'
    ? req.body
    : (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })();

  // Honeypot field: bots that fill it are silently rejected.
  if (clean(body.website, 100)) return sendJson(res, 200, { ok: true, id: null });

  const phone = normalizePhone(body.phone);
  const name = clean(body.name, 100);
  const from = clean(body.from_location, 160);
  const to = clean(body.to_location, 160);
  const source = clean(body.source || 'website', 40) || 'website';
  const service = clean(body.service, 120);
  const notes = clean(body.notes, 1000);
  const moveDate = validDate(body.move_date);

  if (source === 'booking_form' && (!name || !phone || !from || !to)) {
    return sendJson(res, 400, { ok: false, message: 'يرجى إكمال الاسم والهاتف ومناطق النقل.' });
  }
  if (source === 'calculator' && (!from || !to)) {
    return sendJson(res, 400, { ok: false, message: 'يرجى تحديد منطقة الاستلام والتسليم.' });
  }
  if (body.phone && !phone) {
    return sendJson(res, 400, { ok: false, message: 'رقم الهاتف غير صحيح.' });
  }

  const payload = {
    name: name || null,
    phone: phone || null,
    from_location: from,
    to_location: to,
    move_date: moveDate,
    service: service || null,
    rooms: Number.isFinite(Number(body.rooms)) ? Math.max(0, Math.min(100, Number(body.rooms))) : 0,
    acs: Number.isFinite(Number(body.acs)) ? Math.max(0, Math.min(100, Number(body.acs))) : 0,
    floors_down: Number.isFinite(Number(body.floors_down)) ? Math.max(0, Math.min(100, Number(body.floors_down))) : 0,
    floors_up: Number.isFinite(Number(body.floors_up)) ? Math.max(0, Math.min(100, Number(body.floors_up))) : 0,
    services: Array.isArray(body.services) ? body.services.map(x => clean(x, 60)).slice(0, 10) : [],
    discount: clean(body.discount, 80) || null,
    estimated_price: Number.isFinite(Number(body.estimated_price)) ? Math.max(0, Math.min(10000000, Number(body.estimated_price))) : null,
    notes,
    source,
    status: 'new',
    client_ip: getClientIp(req),
    user_agent: clean(req.headers['user-agent'], 500),
  };

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/bookings`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Supabase insert failed:', response.status, data);
      return sendJson(res, 502, { ok: false, message: 'تعذر تسجيل الطلب حاليًا.' });
    }

    return sendJson(res, 201, {
      ok: true,
      id: Array.isArray(data) ? data[0]?.id ?? null : data?.id ?? null,
      message: 'تم تسجيل الطلب بنجاح.',
    });
  } catch (error) {
    console.error('Booking API error:', error);
    return sendJson(res, 500, { ok: false, message: 'حدث خطأ أثناء تسجيل الطلب.' });
  }
}
