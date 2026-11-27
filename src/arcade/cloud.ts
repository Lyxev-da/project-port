import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ArcadeAccount {
  id: string;
  name: string;
  role: 'player' | 'admin';
  createdAt: number;
}

let active: ArcadeAccount | null = null;
let signingKey = '';
const pending = new Map<string, { accountId: string; mode: 'normal' | 'hardcore'; save: Json }>();
let saving: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export const getActiveAccount = () => active;
export function getSigningKey(id: string) {
  if (!active || active.id !== id || !signingKey) throw new Error('Please sign in again to connect the leaderboard.');
  return signingKey;
}

export const profileStorageKey = (id: string, mode: string) => `one-in-a-zillion:v1:account:${id}:${mode}`;
const dirtyStorageKey = (id: string, mode: string) => `zillion:pending:${id}:${mode}`;

function saveStatus(message: string) {
  window.dispatchEvent(new CustomEvent('cloud-save-status', { detail: message }));
}

export function queueCloudSave(key: string, save: Json) {
  const account = active;
  if (!account || !save || typeof save !== 'object' || Array.isArray(save)) return;
  const mode = save['mode'];
  if (mode !== 'normal' && mode !== 'hardcore') return;
  if (key !== profileStorageKey(account.id, mode)) return;
  pending.set(key, { accountId: account.id, mode, save });
  localStorage.setItem(dirtyStorageKey(account.id, mode), '1');
  clearTimeout(timer);
  timer = setTimeout(() => { void flushCloudSaves(); }, 500);
}

export async function flushCloudSaves(): Promise<void> {
  if (saving) {
    try { await saving; } catch { return; }
    if (pending.size) return flushCloudSaves();
    return;
  }
  const batch = [...pending.entries()];
  if (!batch.length) return;
  saving = (async () => {
    for (const [key, item] of batch) {
      const { error } = await supabase.from('game_saves').upsert({ user_id: item.accountId, mode: item.mode, save: item.save, updated_at: new Date().toISOString() });
      if (error) {
        saveStatus('Cloud save pending · progress is safe on this device.');
        throw new Error('Your latest progress has not reached Cloud yet. Please try again when connected.');
      }
      if (pending.get(key) === item) {
        pending.delete(key);
        localStorage.removeItem(dirtyStorageKey(item.accountId, item.mode));
      }
    }
    saveStatus('');
  })();
  try { await saving; } catch { /* Keep the queue and cache for an online retry. */ }
  finally { saving = null; }
}

export async function loadCloudAccount(): Promise<ArcadeAccount | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) { active = null; signingKey = ''; return null; }
  if (!user.email_confirmed_at) throw new Error('Check your email to verify your account first.');
  const [{ data: profile, error: profileError }, { data: roles, error: roleError }, { data: saves, error: saveError }] = await Promise.all([
    supabase.from('profiles').select('id, username, created_at').eq('id', user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id).limit(2),
    supabase.from('game_saves').select('mode, save').eq('user_id', user.id).limit(2),
  ]);
  if (profileError || roleError || saveError || !profile) throw new Error('Could not load your Cloud profile. Please retry.');
  const { data: existingKey, error: keyError } = await supabase.from('leaderboard_keys').select('secret_key').eq('user_id', user.id).maybeSingle();
  if (keyError) throw new Error('Could not load your leaderboard identity.');
  let key = existingKey?.secret_key;
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    key = Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
    const { error: insertError } = await supabase.from('leaderboard_keys').insert({ user_id: user.id, secret_key: key });
    if (insertError) {
      const { data: raced } = await supabase.from('leaderboard_keys').select('secret_key').eq('user_id', user.id).single();
      if (!raced) throw new Error('Could not create your leaderboard identity.');
      key = raced.secret_key;
    }
  }
  const account: ArcadeAccount = { id: profile.id, name: profile.username, role: roles?.some((r) => r.role === 'admin') ? 'admin' : 'player', createdAt: Date.parse(profile.created_at) };
  signingKey = key;
  active = account;
  for (const mode of ['normal', 'hardcore'] as const) {
    const storageKey = profileStorageKey(user.id, mode);
    const cloud = saves?.find((row) => row.mode === mode);
    const cached = localStorage.getItem(storageKey);
    if (cached && localStorage.getItem(dirtyStorageKey(user.id, mode))) {
      try { queueCloudSave(storageKey, JSON.parse(cached) as Json); } catch { /* Fall back to the last Cloud save. */ }
    } else if (cloud) {
      localStorage.setItem(storageKey, JSON.stringify(cloud.save));
    } else {
      // Only a new Cloud profile inherits this browser's guest progress.
      const guest = localStorage.getItem(`one-in-a-zillion:v1:${mode}`);
      if (guest) { localStorage.setItem(storageKey, guest); queueCloudSave(storageKey, JSON.parse(guest) as Json); }
      else localStorage.removeItem(storageKey);
    }
  }
  return account;
}

export async function signOutCloud() {
  await flushCloudSaves();
  if (pending.size) throw new Error('Your Cloud save is still pending. Reconnect before signing out, or download a save file first.');
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Could not sign out. Please try again.');
  active = null;
  signingKey = '';
}