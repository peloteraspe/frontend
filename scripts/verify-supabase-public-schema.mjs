import fs from 'fs';

const checks = [
  { table: 'event', select: 'id,is_featured,is_published' },
  { table: 'paymentMethod', select: 'id,name,is_active,created_by,updated_by,updated_at,type' },
  { table: 'ticket', select: 'id,assistant_id,event_id,user_id,status,qr_token' },
  { table: 'eventPaymentMethod', select: 'id,event,paymentMethod' },
  { table: 'wallet_provider_settings', select: 'id,provider,updated_by' },
  { table: 'product_analytics_events', select: 'id,event_name,event_id,ref_user_id' },
  { table: 'event_announcement', select: 'id,event_id,source_announcement_id,status' },
  { table: 'event_announcement_recipient', select: 'id,announcement_id,event_id,status' },
];

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1).replace(/^"|"$/g, '')];
      }),
  );
}

const dotEnv = loadDotEnv('.env');
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || dotEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || dotEnv.SUPABASE_SERVICE_ROLE_KEY;
const label = process.env.SUPABASE_LABEL || 'supabase';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function verify({ table, select }) {
  const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=1`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (response.ok) {
    return { ok: true };
  }

  let bodyText = await response.text();
  try {
    const parsed = JSON.parse(bodyText);
    bodyText = parsed.message || parsed.code || bodyText;
  } catch {
    // Keep raw text when the response is not JSON.
  }

  return {
    ok: false,
    detail: `${response.status} ${bodyText}`,
  };
}

let failed = false;

for (const check of checks) {
  const result = await verify(check);
  if (result.ok) {
    console.log(`[ok] ${label} ${check.table}`);
    continue;
  }

  failed = true;
  console.log(`[fail] ${label} ${check.table} -> ${result.detail}`);
}

process.exit(failed ? 1 : 0);
