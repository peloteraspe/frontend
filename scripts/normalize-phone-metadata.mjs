import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

function normalizePhoneMetadata(metadata) {
  const rawMetadata = metadata && typeof metadata === 'object' ? metadata : {};
  const legacyPhone = String(rawMetadata.organizer_phone || '').trim();
  const nextPhone = String(rawMetadata.phone || '').trim() || legacyPhone;
  const { organizer_phone: _legacyOrganizerPhone, ...rest } = rawMetadata;

  return {
    ...rest,
    ...(nextPhone ? { phone: nextPhone } : {}),
  };
}

function metadataChanged(before, after) {
  return JSON.stringify(before || {}) !== JSON.stringify(after || {});
}

const dotEnv = loadDotEnv('.env');
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || dotEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || dotEnv.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes('--apply');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let page = 1;
const perPage = 200;
let scannedUsers = 0;
let changedUsers = 0;
let updatedUsers = 0;

while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error(`Failed to list users on page ${page}: ${error.message}`);
    process.exit(1);
  }

  const users = data?.users ?? [];
  if (!users.length) break;

  for (const user of users) {
    scannedUsers += 1;

    const nextUserMetadata = normalizePhoneMetadata(user.user_metadata);
    const nextAppMetadata = normalizePhoneMetadata(user.app_metadata);
    const userMetadataChanged = metadataChanged(user.user_metadata, nextUserMetadata);
    const appMetadataChanged = metadataChanged(user.app_metadata, nextAppMetadata);

    if (!userMetadataChanged && !appMetadataChanged) continue;

    changedUsers += 1;
    console.log(
      `[candidate] ${user.id} email=${user.email || 'sin-correo'} user_metadata=${userMetadataChanged} app_metadata=${appMetadataChanged}`
    );

    if (!shouldApply) continue;

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      ...(userMetadataChanged ? { user_metadata: nextUserMetadata } : {}),
      ...(appMetadataChanged ? { app_metadata: nextAppMetadata } : {}),
    });

    if (updateError) {
      console.error(`[fail] ${user.id} -> ${updateError.message}`);
      continue;
    }

    updatedUsers += 1;
    console.log(`[updated] ${user.id}`);
  }

  if (users.length < perPage) break;
  page += 1;
}

console.log(
  JSON.stringify(
    {
      mode: shouldApply ? 'apply' : 'dry-run',
      scannedUsers,
      changedUsers,
      updatedUsers,
    },
    null,
    2,
  ),
);
